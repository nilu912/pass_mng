// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

contract PassMang {
    struct User {
        bytes32 masterPasswordHash;
        bytes32 salt;
        uint timestamp;
        bool isActive;
        uint totalEntries;
    }
    struct PasswordEntry {
        uint id;
        bytes32 uniqueHash;
        string webUrl;
        bytes userName;
        bytes password;
        uint timestamp;
        bool isActive;
    }

    mapping(address => User) public users;
    mapping(address => bool) public registeredUser;
    mapping(address => PasswordEntry[]) public passwordEntries;
    mapping(bytes32 => bool) public uniqueHashExists;

    event userRegisteredEvent(
        address user,
        bytes32 hashedPass,
        bytes32 salt,
        uint timestamp
    );
    event passwordAddedEvent(
        address user,
        bytes32 uniqueHash,
        string webUrl,
        bytes userName,
        bytes password,
        uint timestamp
    );

    modifier isUserReg() {
        require(isUserRegister(), "User not registered!");
        _;
    }

    function generatePassword(
        string memory _password
    ) internal view returns (bytes32 _masterPass, bytes32 _salt) {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        bytes32 masterPass = keccak256(abi.encodePacked(_password, salt));
        return (masterPass, salt);
    }
    function generateHash(
        bytes memory _input
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_input));
    }
    function registerUser(string memory _masterPassword) public {
        require(!registeredUser[msg.sender], "User already registered!");
        (bytes32 masterPass, bytes32 salt) = generatePassword(_masterPassword);
        users[msg.sender] = User({
            masterPasswordHash: masterPass,
            salt: salt,
            timestamp: block.timestamp,
            isActive: true,
            totalEntries: 0
        });
        registeredUser[msg.sender] = true;
        emit userRegisteredEvent(msg.sender, masterPass, salt, block.timestamp);
    }

    function isUserRegister() public view returns (bool) {
        return registeredUser[msg.sender];
    }

    function addPasswordEntry(
        string memory _webUrl,
        bytes memory _userName,
        bytes memory _password
    ) public isUserReg {
        users[msg.sender].totalEntries++;
        bytes32 uniqueHash = keccak256(abi.encodePacked(_webUrl, _userName));
        require(!uniqueHashExists[uniqueHash], "Entry already exists!");
        uniqueHashExists[uniqueHash] = true;
        passwordEntries[msg.sender].push(
            PasswordEntry({
                id: users[msg.sender].totalEntries,
                uniqueHash: uniqueHash,
                webUrl: _webUrl,
                userName: _userName,
                password: _password,
                timestamp: block.timestamp,
                isActive: true
            })
        );
        emit passwordAddedEvent(
            msg.sender,
            uniqueHash,
            _webUrl,
            _userName,
            _password,
            block.timestamp
        );
    }

    function getUsersAllEntries() public view isUserReg returns(PasswordEntry[] memory){
        return passwordEntries[msg.sender]; 
    }
    function getPasswordEntry(uint _id) public view isUserReg returns(PasswordEntry memory){
        require(users[msg.sender].totalEntries >= _id, "Id not found!");
        return passwordEntries[msg.sender][_id-1];
    }
    function getUserInfo() public view returns(User memory){
        return users[msg.sender];
    }
}
