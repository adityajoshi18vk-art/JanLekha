// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./RoleRegistry.sol";

/// @title BudgetRegistry
/// @notice Records department and project budget allocations approved by Finance.
/// @dev INR budget figures and USDC settlement figures are separate concepts.
/// INR amounts are whole rupees for reporting. USDC amounts are ERC-20 base
/// units with 6 decimals, so 1 USDC equals 1,000,000 base units. The native
/// gas token on Arc is also USDC, but with 18 decimals, and must never be
/// confused with the 6 decimal settlement token.
contract BudgetRegistry {
    RoleRegistry public immutable roles;

    struct Allocation {
        bytes32 id;
        bytes32 departmentId;
        bytes32 projectId;
        uint256 amountInr;
        uint256 amountUsdcBaseUnits;
        address approvedBy;
        uint256 approvedAt;
        bool released;
    }

    mapping(bytes32 => Allocation) private _allocations;
    mapping(bytes32 => uint256) private _authorizedLimitUsdc;
    mapping(bytes32 => uint256) private _totalAllocatedUsdc;

    event AllocationApproved(
        bytes32 indexed id,
        bytes32 indexed departmentId,
        bytes32 indexed projectId,
        uint256 amountInr,
        uint256 amountUsdcBaseUnits,
        address approvedBy
    );
    event AllocationReleased(bytes32 indexed id, bytes32 indexed projectId, address releasedBy);

    error NotFinance(address caller);
    error AllocationExists(bytes32 id);
    error AllocationMissing(bytes32 id);
    error ZeroAmount();
    error AlreadyReleased(bytes32 id);

    modifier onlyFinance() {
        if (!roles.hasRole(roles.FINANCE_ROLE(), msg.sender)) revert NotFinance(msg.sender);
        _;
    }

    constructor(address roleRegistry) {
        roles = RoleRegistry(roleRegistry);
    }

    /// @notice Approve a budget allocation. Only Finance can call this.
    /// @param amountUsdcBaseUnits Settlement amount in ERC-20 USDC base units (6 decimals).
    function approveAllocation(
        bytes32 id,
        bytes32 departmentId,
        bytes32 projectId,
        uint256 amountInr,
        uint256 amountUsdcBaseUnits
    ) external onlyFinance {
        if (_allocations[id].approvedAt != 0) revert AllocationExists(id);
        if (amountUsdcBaseUnits == 0) revert ZeroAmount();
        _allocations[id] = Allocation({
            id: id,
            departmentId: departmentId,
            projectId: projectId,
            amountInr: amountInr,
            amountUsdcBaseUnits: amountUsdcBaseUnits,
            approvedBy: msg.sender,
            approvedAt: block.timestamp,
            released: false
        });
        _authorizedLimitUsdc[projectId] += amountUsdcBaseUnits;
        _totalAllocatedUsdc[projectId] += amountUsdcBaseUnits;
        emit AllocationApproved(id, departmentId, projectId, amountInr, amountUsdcBaseUnits, msg.sender);
    }

    /// @notice Mark an approved allocation as released for payment. Only Finance.
    function releaseAllocation(bytes32 id) external onlyFinance {
        Allocation storage allocation = _allocations[id];
        if (allocation.approvedAt == 0) revert AllocationMissing(id);
        if (allocation.released) revert AlreadyReleased(id);
        allocation.released = true;
        emit AllocationReleased(id, allocation.projectId, msg.sender);
    }

    /// @notice Total USDC a project is authorised to pay out, in 6 decimal base units.
    function authorizedLimitUsdc(bytes32 projectId) external view returns (uint256) {
        return _authorizedLimitUsdc[projectId];
    }

    /// @notice Total USDC allocated to a project, in 6 decimal base units.
    function totalAllocatedUsdc(bytes32 projectId) external view returns (uint256) {
        return _totalAllocatedUsdc[projectId];
    }

    function getAllocation(bytes32 id) external view returns (Allocation memory) {
        return _allocations[id];
    }
}
