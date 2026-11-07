// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/RoleRegistry.sol";
import "../src/BudgetRegistry.sol";
import "../src/ProjectRegistry.sol";
import "../src/ProcurementRegistry.sol";
import "../src/MilestoneRegistry.sol";
import "../src/PaymentRegistry.sol";
import "../src/DocumentRegistry.sol";
import "../src/AuditRegistry.sol";

/// @title Deploy JanLekha 2.0 registries to Arc Testnet
/// @notice Run with: forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.io --broadcast
/// @dev The deployer key is read only from the PRIVATE_KEY environment variable.
/// It is never hardcoded here or anywhere else in this repository. The
/// deployer becomes the first ADMIN, and should grant the Finance,
/// Procurement, Contractor, and Auditor roles to the real accounts after
/// deployment, then consider revoking its own ADMIN role.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        RoleRegistry roles = new RoleRegistry(deployer);
        BudgetRegistry budgets = new BudgetRegistry(address(roles));
        ProjectRegistry projects = new ProjectRegistry(address(roles));
        ProcurementRegistry procurement = new ProcurementRegistry(address(roles));
        MilestoneRegistry milestones = new MilestoneRegistry(address(roles));
        PaymentRegistry payments = new PaymentRegistry(
            address(roles),
            address(budgets),
            address(milestones)
        );
        DocumentRegistry documents = new DocumentRegistry(address(roles));
        AuditRegistry audits = new AuditRegistry(address(roles));

        milestones.setPaymentRegistry(address(payments));

        vm.stopBroadcast();

        console.log("Arc Testnet chain id: 5042002");
        console.log("Deployer (first ADMIN):", deployer);
        console.log("RoleRegistry:", address(roles));
        console.log("BudgetRegistry:", address(budgets));
        console.log("ProjectRegistry:", address(projects));
        console.log("ProcurementRegistry:", address(procurement));
        console.log("MilestoneRegistry:", address(milestones));
        console.log("PaymentRegistry:", address(payments));
        console.log("DocumentRegistry:", address(documents));
        console.log("AuditRegistry:", address(audits));
        console.log("Next step: set VITE_ARC_*_ADDRESS in the frontend .env from these addresses.");
    }
}
