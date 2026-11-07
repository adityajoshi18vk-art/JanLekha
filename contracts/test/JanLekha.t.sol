// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/RoleRegistry.sol";
import "../src/BudgetRegistry.sol";
import "../src/ProjectRegistry.sol";
import "../src/ProcurementRegistry.sol";
import "../src/MilestoneRegistry.sol";
import "../src/PaymentRegistry.sol";
import "../src/DocumentRegistry.sol";
import "../src/AuditRegistry.sol";

/// @title JanLekha tests
/// @notice Access control and financial invariants for the eight registries.
/// All amounts in these tests are demo figures, not real expenditure.
contract JanLekhaTest is Test {
    RoleRegistry internal roles;
    BudgetRegistry internal budgets;
    ProjectRegistry internal projects;
    ProcurementRegistry internal procurement;
    MilestoneRegistry internal milestones;
    PaymentRegistry internal payments;
    DocumentRegistry internal documents;
    AuditRegistry internal audits;

    address internal admin = address(this);
    address internal finance = address(0xF1);
    address internal procurementOfficer = address(0xE1);
    address internal contractor = address(0xC1);
    address internal contractorTwo = address(0xC2);
    address internal auditor = address(0xA1);
    address internal auditorTwo = address(0xA2);
    address internal stranger = address(0xB1);

    bytes32 internal projectId = keccak256("proj-1");
    bytes32 internal deptId = keccak256("dept-health");
    bytes32 internal milestoneId = keccak256("ms-1");
    bytes32 internal invoiceHash = keccak256("invoice-001");

    function setUp() public {
        roles = new RoleRegistry(admin);
        budgets = new BudgetRegistry(address(roles));
        projects = new ProjectRegistry(address(roles));
        procurement = new ProcurementRegistry(address(roles));
        milestones = new MilestoneRegistry(address(roles));
        payments = new PaymentRegistry(address(roles), address(budgets), address(milestones));
        documents = new DocumentRegistry(address(roles));
        audits = new AuditRegistry(address(roles));

        roles.grantRole(roles.FINANCE_ROLE(), finance);
        roles.grantRole(roles.PROCUREMENT_ROLE(), procurementOfficer);
        roles.grantRole(roles.CONTRACTOR_ROLE(), contractor);
        roles.grantRole(roles.CONTRACTOR_ROLE(), contractorTwo);
        roles.grantRole(roles.AUDITOR_ROLE(), auditor);
        roles.grantRole(roles.AUDITOR_ROLE(), auditorTwo);

        vm.prank(admin);
        milestones.setPaymentRegistry(address(payments));

        vm.prank(admin);
        projects.registerProject(projectId, "District Hospital Modernisation", deptId, contractor, 420_000_000_000);
    }

    // --- Role access control ---

    function testOnlyAdminCanGrantRoles() public {
        bytes32 financeRole = roles.FINANCE_ROLE();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(RoleRegistry.NotAdmin.selector, stranger));
        roles.grantRole(financeRole, stranger);
        assertFalse(roles.hasRole(financeRole, stranger));
    }

    function testAdminCanGrantAndRevokeRoles() public {
        roles.grantRole(roles.AUDITOR_ROLE(), stranger);
        assertTrue(roles.hasRole(roles.AUDITOR_ROLE(), stranger));
        roles.revokeRole(roles.AUDITOR_ROLE(), stranger);
        assertFalse(roles.hasRole(roles.AUDITOR_ROLE(), stranger));
    }

    function testOnlyFinanceCanApproveAllocations() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(BudgetRegistry.NotFinance.selector, stranger));
        budgets.approveAllocation(keccak256("alloc-1"), deptId, projectId, 1000, 1_000_000);

        vm.prank(finance);
        budgets.approveAllocation(keccak256("alloc-1"), deptId, projectId, 1000, 1_000_000);
        assertEq(budgets.authorizedLimitUsdc(projectId), 1_000_000);
    }

    function testOnlyProcurementCanPublishTenders() public {
        vm.prank(contractor);
        vm.expectRevert(
            abi.encodeWithSelector(ProcurementRegistry.NotProcurement.selector, contractor)
        );
        procurement.publishTender(keccak256("ten-1"), projectId, "Civil works", 1000, block.timestamp + 1 days);
    }

    // --- Milestone separation of duties ---

    function _submitMilestone() internal {
        vm.prank(contractor);
        milestones.submitMilestone(milestoneId, projectId, 1000, 1_000_000, keccak256("evidence-1"));
    }

    function testContractorCannotVerifyOwnMilestone() public {
        _submitMilestone();
        // The submitting contractor holds no auditor role, so this reverts on role.
        vm.prank(contractor);
        vm.expectRevert(abi.encodeWithSelector(MilestoneRegistry.NotAuditor.selector, contractor));
        milestones.verifyMilestone(milestoneId);

        // Even an auditor who is also the submitter cannot self verify. Grant the
        // contractor an auditor role, then the self verification check must fire.
        roles.grantRole(roles.AUDITOR_ROLE(), contractor);
        vm.prank(contractor);
        vm.expectRevert(abi.encodeWithSelector(MilestoneRegistry.SelfVerification.selector, contractor));
        milestones.verifyMilestone(milestoneId);
    }

    function testIndependentAuditorCanVerifyMilestone() public {
        _submitMilestone();
        vm.prank(auditor);
        milestones.verifyMilestone(milestoneId);
        MilestoneRegistry.Milestone memory m = milestones.getMilestone(milestoneId);
        assertEq(uint256(m.status), uint256(MilestoneRegistry.MilestoneStatus.Verified));
        assertEq(m.verifiedBy, auditor);
    }

    function testMilestoneCannotBeVerifiedTwice() public {
        _submitMilestone();
        vm.prank(auditor);
        milestones.verifyMilestone(milestoneId);
        vm.prank(auditorTwo);
        vm.expectRevert(
            abi.encodeWithSelector(
                MilestoneRegistry.WrongStatus.selector,
                milestoneId,
                MilestoneRegistry.MilestoneStatus.Verified
            )
        );
        milestones.verifyMilestone(milestoneId);
    }

    // --- Document immutability ---

    function testAuditorCannotEditOriginalRecords() public {
        bytes32 docId = keccak256("doc-1");
        bytes32 contentHash = keccak256("contract-bytes");
        vm.prank(procurementOfficer);
        documents.registerDocument(docId, projectId, contentHash, "Contract");

        vm.prank(auditor);
        documents.verifyDocument(docId);

        DocumentRegistry.Document memory doc = documents.getDocument(docId);
        assertEq(doc.contentHash, contentHash);
        assertEq(doc.uploadedBy, procurementOfficer);
        assertTrue(doc.verified);
        assertEq(doc.verifiedBy, auditor);

        // Re-registering the same content hash is rejected, so the original
        // record cannot be replaced by a second upload with the same hash.
        vm.prank(procurementOfficer);
        vm.expectRevert(abi.encodeWithSelector(DocumentRegistry.DuplicateContentHash.selector, contentHash));
        documents.registerDocument(keccak256("doc-2"), projectId, contentHash, "Contract");
    }

    function testOnlyAuditorCanVerifyDocuments() public {
        bytes32 docId = keccak256("doc-9");
        vm.prank(procurementOfficer);
        documents.registerDocument(docId, projectId, keccak256("bytes-9"), "Invoice");
        vm.prank(finance);
        vm.expectRevert(abi.encodeWithSelector(DocumentRegistry.NotAuditor.selector, finance));
        documents.verifyDocument(docId);
    }

    // --- Payment invariants ---

    function _approveLimit(uint256 baseUnits) internal {
        vm.prank(finance);
        budgets.approveAllocation(keccak256("alloc-main"), deptId, projectId, 1000, baseUnits);
    }

    function _verifiedMilestone() internal {
        _submitMilestone();
        vm.prank(auditor);
        milestones.verifyMilestone(milestoneId);
    }

    function testPaymentCannotExceedAuthorisedLimit() public {
        _approveLimit(1_000_000);
        _verifiedMilestone();

        // 1,000,001 base units is 1 USDC over the 1 USDC authorised limit.
        vm.prank(finance);
        vm.expectRevert(
            abi.encodeWithSelector(
                PaymentRegistry.ExceedsAuthorisedLimit.selector,
                projectId,
                1_000_001,
                1_000_000
            )
        );
        payments.recordPayment(
            keccak256("pay-1"), projectId, milestoneId, contractor, 1_000_001, invoiceHash
        );

        // Paying exactly the limit succeeds.
        vm.prank(finance);
        payments.recordPayment(
            keccak256("pay-1"), projectId, milestoneId, contractor, 1_000_000, invoiceHash
        );
        assertEq(payments.totalPaidUsdc(projectId), 1_000_000);
        assertEq(payments.remainingLimitUsdc(projectId), 0);
    }

    function testDuplicateInvoiceHashIsRejected() public {
        _approveLimit(10_000_000);
        _verifiedMilestone();

        vm.prank(finance);
        payments.recordPayment(
            keccak256("pay-1"), projectId, milestoneId, contractor, 1_000_000, invoiceHash
        );

        bytes32 milestoneTwo = keccak256("ms-2");
        vm.prank(contractorTwo);
        milestones.submitMilestone(milestoneTwo, projectId, 1000, 1_000_000, keccak256("evidence-2"));
        vm.prank(auditor);
        milestones.verifyMilestone(milestoneTwo);

        vm.prank(finance);
        vm.expectRevert(abi.encodeWithSelector(PaymentRegistry.DuplicateInvoiceHash.selector, invoiceHash));
        payments.recordPayment(
            keccak256("pay-2"), projectId, milestoneTwo, contractorTwo, 1_000_000, invoiceHash
        );
    }

    function testPaymentRequiresVerifiedMilestone() public {
        _approveLimit(10_000_000);
        _submitMilestone();
        vm.prank(finance);
        vm.expectRevert(abi.encodeWithSelector(PaymentRegistry.MilestoneNotVerified.selector, milestoneId));
        payments.recordPayment(
            keccak256("pay-1"), projectId, milestoneId, contractor, 1_000_000, invoiceHash
        );
    }

    function testOnlyFinanceCanRecordPayments() public {
        _approveLimit(10_000_000);
        _verifiedMilestone();
        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(PaymentRegistry.NotFinance.selector, auditor));
        payments.recordPayment(
            keccak256("pay-1"), projectId, milestoneId, contractor, 1_000_000, invoiceHash
        );
    }

    // --- USDC 6 decimal handling ---

    function testUsdcSixDecimalHandlingIsCorrect() public {
        assertEq(payments.USDC_DECIMALS(), 6);
        assertEq(payments.USDC_BASE_UNIT(), 1_000_000);
        assertEq(payments.usdcToBaseUnits(1), 1_000_000);
        assertEq(payments.usdcToBaseUnits(250), 250_000_000);
        // 1.5 USDC expressed in base units is 1,500,000, never 1.5e18.
        assertEq(payments.usdcToBaseUnits(3) / 2, 1_500_000);

        _approveLimit(1_500_000);
        _verifiedMilestone();
        vm.prank(finance);
        payments.recordPayment(
            keccak256("pay-1"), projectId, milestoneId, contractor, 1_500_000, invoiceHash
        );
        PaymentRegistry.Payment memory p = payments.getPayment(keccak256("pay-1"));
        assertEq(p.amountUsdcBaseUnits, 1_500_000);
    }

    // --- Audit flags ---

    function testAuditorCannotEditFlagReasonOnResolve() public {
        bytes32 flagId = keccak256("flag-1");
        vm.prank(auditor);
        audits.raiseFlag(flagId, projectId, "Payment above authorised limit", 4);
        vm.prank(auditorTwo);
        audits.resolveFlag(flagId, "Checked, second authoriser confirmed");
        AuditRegistry.Flag memory flag = audits.getFlag(flagId);
        assertEq(flag.reason, "Payment above authorised limit");
        assertEq(flag.risk, 4);
        assertEq(flag.raisedBy, auditor);
        assertTrue(flag.resolved);
        assertEq(flag.resolutionNote, "Checked, second authoriser confirmed");
    }

    function testOnlyAuditorCanRaiseFlags() public {
        vm.prank(finance);
        vm.expectRevert(abi.encodeWithSelector(AuditRegistry.NotAuditor.selector, finance));
        audits.raiseFlag(keccak256("flag-9"), projectId, "Late milestone", 2);
    }

    // --- End to end happy path ---

    function testEndToEndAllocationToPayment() public {
        _approveLimit(5_000_000);
        _verifiedMilestone();
        vm.prank(finance);
        payments.recordPayment(
            keccak256("pay-e2e"), projectId, milestoneId, contractor, 2_000_000, invoiceHash
        );
        MilestoneRegistry.Milestone memory m = milestones.getMilestone(milestoneId);
        assertEq(uint256(m.status), uint256(MilestoneRegistry.MilestoneStatus.Paid));
        assertEq(payments.remainingLimitUsdc(projectId), 3_000_000);
    }

    function testTenderBidAndAwardFlow() public {
        bytes32 tenderId = keccak256("ten-1");
        vm.prank(procurementOfficer);
        procurement.publishTender(tenderId, projectId, "Civil works", 1000, block.timestamp + 7 days);
        vm.prank(contractor);
        procurement.submitBid(tenderId, 900);
        vm.prank(contractorTwo);
        procurement.submitBid(tenderId, 850);
        vm.prank(procurementOfficer);
        procurement.selectBid(tenderId, contractorTwo);
        ProcurementRegistry.Tender memory tender = procurement.getTender(tenderId);
        assertFalse(tender.open);
        assertEq(tender.awardedTo, contractorTwo);
        assertEq(tender.awardedAmountInr, 850);
    }
}
