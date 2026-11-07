// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./RoleRegistry.sol";

/// @title MilestoneRegistry
/// @notice Milestone lifecycle: Contractor submits, Auditor verifies, Finance
/// (or the PaymentRegistry) marks paid. Separation of duties is enforced on
/// chain. A contractor can never verify their own milestone, and a milestone
/// can only move forward through the states Submitted, Verified, Paid, or be
/// Rejected by an auditor.
contract MilestoneRegistry {
    RoleRegistry public immutable roles;

    enum MilestoneStatus {
        Submitted,
        Verified,
        Paid,
        Rejected
    }

    struct Milestone {
        bytes32 id;
        bytes32 projectId;
        address submitter;
        uint256 amountInr;
        uint256 amountUsdcBaseUnits;
        bytes32 evidenceHash;
        MilestoneStatus status;
        address verifiedBy;
        uint256 submittedAt;
        uint256 verifiedAt;
    }

    mapping(bytes32 => Milestone) private _milestones;

    /// @notice Address of the PaymentRegistry, set once by an ADMIN so that a
    /// recorded payment can mark its milestone Paid without a Finance signature.
    address public paymentRegistry;

    event MilestoneSubmitted(
        bytes32 indexed id,
        bytes32 indexed projectId,
        address indexed submitter,
        uint256 amountInr,
        uint256 amountUsdcBaseUnits,
        bytes32 evidenceHash
    );
    event MilestoneVerified(bytes32 indexed id, address indexed verifiedBy);
    event MilestonePaid(bytes32 indexed id, address indexed markedBy);
    event MilestoneRejected(bytes32 indexed id, address indexed rejectedBy);
    event PaymentRegistrySet(address indexed paymentRegistry);

    error NotContractor(address caller);
    error NotAuditor(address caller);
    error NotFinanceOrPaymentRegistry(address caller);
    error NotAdmin(address caller);
    error MilestoneExists(bytes32 id);
    error MilestoneMissing(bytes32 id);
    error SelfVerification(address submitter);
    error WrongStatus(bytes32 id, MilestoneStatus status);
    error PaymentRegistryAlreadySet(address existing);

    modifier onlyContractor() {
        if (!roles.hasRole(roles.CONTRACTOR_ROLE(), msg.sender)) revert NotContractor(msg.sender);
        _;
    }

    modifier onlyAuditor() {
        if (!roles.hasRole(roles.AUDITOR_ROLE(), msg.sender)) revert NotAuditor(msg.sender);
        _;
    }

    constructor(address roleRegistry) {
        roles = RoleRegistry(roleRegistry);
    }

    /// @notice Point this registry at the deployed PaymentRegistry. ADMIN only, once.
    function setPaymentRegistry(address registry) external {
        if (!roles.hasRole(roles.ADMIN_ROLE(), msg.sender)) revert NotAdmin(msg.sender);
        if (paymentRegistry != address(0)) revert PaymentRegistryAlreadySet(paymentRegistry);
        paymentRegistry = registry;
        emit PaymentRegistrySet(registry);
    }

    /// @notice Submit a milestone with its evidence hash. Only a Contractor can call this.
    function submitMilestone(
        bytes32 id,
        bytes32 projectId,
        uint256 amountInr,
        uint256 amountUsdcBaseUnits,
        bytes32 evidenceHash
    ) external onlyContractor {
        if (_milestones[id].submittedAt != 0) revert MilestoneExists(id);
        _milestones[id] = Milestone({
            id: id,
            projectId: projectId,
            submitter: msg.sender,
            amountInr: amountInr,
            amountUsdcBaseUnits: amountUsdcBaseUnits,
            evidenceHash: evidenceHash,
            status: MilestoneStatus.Submitted,
            verifiedBy: address(0),
            submittedAt: block.timestamp,
            verifiedAt: 0
        });
        emit MilestoneSubmitted(id, projectId, msg.sender, amountInr, amountUsdcBaseUnits, evidenceHash);
    }

    /// @notice Verify a submitted milestone. Only an Auditor, and never the submitter.
    function verifyMilestone(bytes32 id) external onlyAuditor {
        Milestone storage milestone = _milestones[id];
        if (milestone.submittedAt == 0) revert MilestoneMissing(id);
        if (milestone.status != MilestoneStatus.Submitted) revert WrongStatus(id, milestone.status);
        if (milestone.submitter == msg.sender) revert SelfVerification(msg.sender);
        milestone.status = MilestoneStatus.Verified;
        milestone.verifiedBy = msg.sender;
        milestone.verifiedAt = block.timestamp;
        emit MilestoneVerified(id, msg.sender);
    }

    /// @notice Reject a submitted milestone. Only an Auditor, and never the submitter.
    function rejectMilestone(bytes32 id) external onlyAuditor {
        Milestone storage milestone = _milestones[id];
        if (milestone.submittedAt == 0) revert MilestoneMissing(id);
        if (milestone.status != MilestoneStatus.Submitted) revert WrongStatus(id, milestone.status);
        if (milestone.submitter == msg.sender) revert SelfVerification(msg.sender);
        milestone.status = MilestoneStatus.Rejected;
        emit MilestoneRejected(id, msg.sender);
    }

    /// @notice Mark a verified milestone Paid. Finance, or the PaymentRegistry after it records a payment.
    function markPaid(bytes32 id) external {
        bool isFinance = roles.hasRole(roles.FINANCE_ROLE(), msg.sender);
        if (!isFinance && msg.sender != paymentRegistry) {
            revert NotFinanceOrPaymentRegistry(msg.sender);
        }
        Milestone storage milestone = _milestones[id];
        if (milestone.submittedAt == 0) revert MilestoneMissing(id);
        if (milestone.status != MilestoneStatus.Verified) revert WrongStatus(id, milestone.status);
        milestone.status = MilestoneStatus.Paid;
        emit MilestonePaid(id, msg.sender);
    }

    function getMilestone(bytes32 id) external view returns (Milestone memory) {
        return _milestones[id];
    }
}
