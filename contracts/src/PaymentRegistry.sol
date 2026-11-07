// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./RoleRegistry.sol";
import "./BudgetRegistry.sol";
import "./MilestoneRegistry.sol";

/// @title PaymentRegistry
/// @notice Records USDC settlement of verified milestones, with hard financial
/// invariants enforced on chain.
/// @dev Three invariants are checked before any payment is recorded:
/// 1. The milestone must be Verified.
/// 2. The payment must not push a project past its Finance approved
///    authorised limit, so a payment can never exceed the authorised limit.
/// 3. An invoice hash can only be used once, so a duplicate invoice hash is
///    rejected.
/// Amounts are ERC-20 USDC base units with 6 decimals. 1 USDC is 1,000,000
/// base units. This is different from the native gas token on Arc, which is
/// also USDC but with 18 decimals. Never mix the two.
contract PaymentRegistry {
    RoleRegistry public immutable roles;
    BudgetRegistry public immutable budgets;
    MilestoneRegistry public immutable milestones;

    uint8 public constant USDC_DECIMALS = 6;
    uint256 public constant USDC_BASE_UNIT = 1_000_000;

    struct Payment {
        bytes32 id;
        bytes32 projectId;
        bytes32 milestoneId;
        address payee;
        uint256 amountUsdcBaseUnits;
        bytes32 invoiceHash;
        address recordedBy;
        uint256 recordedAt;
    }

    mapping(bytes32 => Payment) private _payments;
    mapping(bytes32 => bool) private _invoiceUsed;
    mapping(bytes32 => uint256) private _totalPaidUsdc;

    event PaymentRecorded(
        bytes32 indexed id,
        bytes32 indexed projectId,
        bytes32 indexed milestoneId,
        address payee,
        uint256 amountUsdcBaseUnits,
        bytes32 invoiceHash,
        address recordedBy
    );

    error NotFinance(address caller);
    error PaymentExists(bytes32 id);
    error ZeroAmount();
    error MilestoneNotVerified(bytes32 milestoneId);
    error ExceedsAuthorisedLimit(bytes32 projectId, uint256 requested, uint256 remaining);
    error DuplicateInvoiceHash(bytes32 invoiceHash);
    error MilestoneProjectMismatch(bytes32 milestoneId, bytes32 projectId);

    modifier onlyFinance() {
        if (!roles.hasRole(roles.FINANCE_ROLE(), msg.sender)) revert NotFinance(msg.sender);
        _;
    }

    constructor(address roleRegistry, address budgetRegistry, address milestoneRegistry) {
        roles = RoleRegistry(roleRegistry);
        budgets = BudgetRegistry(budgetRegistry);
        milestones = MilestoneRegistry(milestoneRegistry);
    }

    /// @notice Convert whole USDC to ERC-20 base units (6 decimals). 1 USDC is 1,000,000.
    function usdcToBaseUnits(uint256 wholeUsdc) external pure returns (uint256) {
        return wholeUsdc * USDC_BASE_UNIT;
    }

    /// @notice Record a settlement for a verified milestone. Only Finance can call this.
    function recordPayment(
        bytes32 id,
        bytes32 projectId,
        bytes32 milestoneId,
        address payee,
        uint256 amountUsdcBaseUnits,
        bytes32 invoiceHash
    ) external onlyFinance {
        if (_payments[id].recordedAt != 0) revert PaymentExists(id);
        if (amountUsdcBaseUnits == 0) revert ZeroAmount();
        if (_invoiceUsed[invoiceHash]) revert DuplicateInvoiceHash(invoiceHash);

        MilestoneRegistry.Milestone memory milestone = milestones.getMilestone(milestoneId);
        if (milestone.submittedAt == 0 || milestone.status != MilestoneRegistry.MilestoneStatus.Verified) {
            revert MilestoneNotVerified(milestoneId);
        }
        if (milestone.projectId != projectId) {
            revert MilestoneProjectMismatch(milestoneId, projectId);
        }

        uint256 limit = budgets.authorizedLimitUsdc(projectId);
        uint256 paid = _totalPaidUsdc[projectId];
        if (amountUsdcBaseUnits > limit - paid) {
            revert ExceedsAuthorisedLimit(projectId, amountUsdcBaseUnits, limit - paid);
        }

        _invoiceUsed[invoiceHash] = true;
        _totalPaidUsdc[projectId] = paid + amountUsdcBaseUnits;
        _payments[id] = Payment({
            id: id,
            projectId: projectId,
            milestoneId: milestoneId,
            payee: payee,
            amountUsdcBaseUnits: amountUsdcBaseUnits,
            invoiceHash: invoiceHash,
            recordedBy: msg.sender,
            recordedAt: block.timestamp
        });
        milestones.markPaid(milestoneId);
        emit PaymentRecorded(id, projectId, milestoneId, payee, amountUsdcBaseUnits, invoiceHash, msg.sender);
    }

    /// @notice Total USDC settled for a project, in 6 decimal base units.
    function totalPaidUsdc(bytes32 projectId) external view returns (uint256) {
        return _totalPaidUsdc[projectId];
    }

    /// @notice Remaining authorised USDC for a project, in 6 decimal base units.
    function remainingLimitUsdc(bytes32 projectId) external view returns (uint256) {
        return budgets.authorizedLimitUsdc(projectId) - _totalPaidUsdc[projectId];
    }

    function invoiceUsed(bytes32 invoiceHash) external view returns (bool) {
        return _invoiceUsed[invoiceHash];
    }

    function getPayment(bytes32 id) external view returns (Payment memory) {
        return _payments[id];
    }
}
