// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {PassMang} from "./PassMang.sol";
import {Test} from "forge-std/Test.sol";
import "hardhat/console.sol";

contract PassMangTest is Test {
    PassMang passmng;
    
    function setUp() public{
        passmng = new PassMang();
    }
    function test_registerUser() public{
        passmng.registerUser("abcd");
        bool val = passmng.isUserRegister();
        console.log(val);
    PassMang.User memory data = passmng.getUserInfo();
    console.logBytes32(data.masterPasswordHash);
    console.logBytes32(data.salt);
    console.log(data.timestamp);
    console.log(data.isActive);
    console.log(data.totalEntries);
        // console.log(data[1]);
        // console.log(data[2]);
    }
}