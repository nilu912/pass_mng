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
        string userName;
        string password;
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
        string userName,
        string password,
        uint timestamp
    );
    
    event passwordUpdatedEvent(
        address user,
        uint id,
        bytes32 oldHash,
        bytes32 newHash,
        string webUrl,
        uint timestamp
    );
    
    event passwordDeletedEvent(
        address user,
        uint id,
        bytes32 uniqueHash,
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
        string memory _userName,
        string memory _password
    ) public isUserReg {
        bytes32 uniqueHash = keccak256(abi.encodePacked(_webUrl, _userName, msg.sender));
        require(!uniqueHashExists[uniqueHash], "Entry already exists!");
        
        users[msg.sender].totalEntries++;
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
        require(_id > 0 && _id <= users[msg.sender].totalEntries, "Invalid ID!");
        return passwordEntries[msg.sender][_id - 1];
    }
    
    function getUserInfo() public view returns(User memory){
        return users[msg.sender];
    }
    
    // FIXED: Update password entry with proper ID handling and uniqueHash update
    function updatePasswordEntry(
        uint256 _id,
        string memory _webUrl,
        string memory _userName,
        string memory _password
    ) public isUserReg {
        require(_id > 0 && _id <= users[msg.sender].totalEntries, "Invalid entry ID");
        
        uint256 index = _id - 1; // Convert ID to array index
        PasswordEntry storage entry = passwordEntries[msg.sender][index];
        
        require(entry.isActive, "Entry is not active");
        
        // Generate new uniqueHash
        bytes32 newUniqueHash = keccak256(abi.encodePacked(_webUrl, _userName, msg.sender));
        
        // If the hash changed, check if new hash already exists
        if (newUniqueHash != entry.uniqueHash) {
            require(!uniqueHashExists[newUniqueHash], "Entry with these credentials already exists!");
            
            // Remove old hash and add new hash
            uniqueHashExists[entry.uniqueHash] = false;
            uniqueHashExists[newUniqueHash] = true;
        }
        
        // Store old hash for event
        bytes32 oldHash = entry.uniqueHash;
        
        // Update entry
        entry.uniqueHash = newUniqueHash;
        entry.webUrl = _webUrl;
        entry.userName = _userName;
        entry.password = _password;
        entry.timestamp = block.timestamp;
        
        emit passwordUpdatedEvent(
            msg.sender,
            _id,
            oldHash,
            newUniqueHash,
            _webUrl,
            block.timestamp
        );
    }
    
    // ADDED: Delete password entry (soft delete)
    function deletePasswordEntry(uint256 _id) public isUserReg {
        require(_id > 0 && _id <= users[msg.sender].totalEntries, "Invalid entry ID");
        
        uint256 index = _id - 1;
        PasswordEntry storage entry = passwordEntries[msg.sender][index];
        
        require(entry.isActive, "Entry is already deleted");
        
        // Soft delete - mark as inactive
        entry.isActive = false;
        
        // Remove from uniqueHash mapping
        uniqueHashExists[entry.uniqueHash] = false;
        
        emit passwordDeletedEvent(
            msg.sender,
            _id,
            entry.uniqueHash,
            block.timestamp
        );
    }
    
    // ADDED: Hard delete (optional - permanently removes entry)
    function permanentlyDeleteEntry(uint256 _id) public isUserReg {
        require(_id > 0 && _id <= users[msg.sender].totalEntries, "Invalid entry ID");
        
        uint256 index = _id - 1;
        PasswordEntry storage entry = passwordEntries[msg.sender][index];
        
        // Remove from uniqueHash mapping
        uniqueHashExists[entry.uniqueHash] = false;
        
        // Get array length
        uint256 lastIndex = passwordEntries[msg.sender].length - 1;
        
        // If not the last element, swap with last element
        if (index != lastIndex) {
            passwordEntries[msg.sender][index] = passwordEntries[msg.sender][lastIndex];
        }
        
        // Remove last element
        passwordEntries[msg.sender].pop();
        
        emit passwordDeletedEvent(
            msg.sender,
            _id,
            entry.uniqueHash,
            block.timestamp
        );
    }
    
    // ADDED: Reactivate a soft-deleted entry
    function reactivateEntry(uint256 _id) public isUserReg {
        require(_id > 0 && _id <= users[msg.sender].totalEntries, "Invalid entry ID");
        
        uint256 index = _id - 1;
        PasswordEntry storage entry = passwordEntries[msg.sender][index];
        
        require(!entry.isActive, "Entry is already active");
        
        // Check if hash is available
        require(!uniqueHashExists[entry.uniqueHash], "Conflicting entry exists");
        
        entry.isActive = true;
        uniqueHashExists[entry.uniqueHash] = true;
    }
}


// pragma solidity ^0.8.23;

// contract PassMang {
//     struct User {
//         bytes32 masterPasswordHash;
//         bytes32 salt;
//         uint timestamp;
//         bool isActive;
//         uint totalEntries;
//     }
//     struct PasswordEntry {
//         uint id;
//         bytes32 uniqueHash;
//         string webUrl;
//         string userName;
//         string password;
//         uint timestamp;
//         bool isActive;
//     }

//     mapping(address => User) public users;
//     mapping(address => bool) public registeredUser;
//     mapping(address => PasswordEntry[]) public passwordEntries;
//     mapping(bytes32 => bool) public uniqueHashExists;

//     event userRegisteredEvent(
//         address user,
//         bytes32 hashedPass,
//         bytes32 salt,
//         uint timestamp
//     );
//     event passwordAddedEvent(
//         address user,
//         bytes32 uniqueHash,
//         string webUrl,
//         string userName,
//         string password,
//         uint timestamp
//     );

//     modifier isUserReg() {
//         require(isUserRegister(), "User not registered!");
//         _;
//     }

//     function generatePassword(
//         string memory _password
//     ) internal view returns (bytes32 _masterPass, bytes32 _salt) {
//         bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.timestamp));
//         bytes32 masterPass = keccak256(abi.encodePacked(_password, salt));
//         return (masterPass, salt);
//     }
//     function generateHash(
//         bytes memory _input
//     ) internal pure returns (bytes32) {
//         return keccak256(abi.encodePacked(_input));
//     }
//     function registerUser(string memory _masterPassword) public {
//         require(!registeredUser[msg.sender], "User already registered!");
//         (bytes32 masterPass, bytes32 salt) = generatePassword(_masterPassword);
//         users[msg.sender] = User({
//             masterPasswordHash: masterPass,
//             salt: salt,
//             timestamp: block.timestamp,
//             isActive: true,
//             totalEntries: 0
//         });
//         registeredUser[msg.sender] = true;
//         emit userRegisteredEvent(msg.sender, masterPass, salt, block.timestamp);
//     }

//     function isUserRegister() public view returns (bool) {
//         return registeredUser[msg.sender];
//     }

//     function addPasswordEntry(
//         string memory _webUrl,
//         // bytes memory _userName,
//         // bytes memory _password
//         string memory _userName,
//         string memory _password
//     ) public isUserReg {
//         users[msg.sender].totalEntries++;
//         bytes32 uniqueHash = keccak256(abi.encodePacked(_webUrl, _userName));
//         require(!uniqueHashExists[uniqueHash], "Entry already exists!");
//         uniqueHashExists[uniqueHash] = true;
//         passwordEntries[msg.sender].push(
//             PasswordEntry({
//                 id: users[msg.sender].totalEntries,
//                 uniqueHash: uniqueHash,
//                 webUrl: _webUrl,
//                 userName: _userName,
//                 password: _password,
//                 timestamp: block.timestamp,
//                 isActive: true
//             })
//         );
//         emit passwordAddedEvent(
//             msg.sender,
//             uniqueHash,
//             _webUrl,
//             _userName,
//             _password,
//             block.timestamp
//         );
//     }

//     function getUsersAllEntries() public view isUserReg returns(PasswordEntry[] memory){
//         return passwordEntries[msg.sender]; 
//     }
//     function getPasswordEntry(uint _id) public view isUserReg returns(PasswordEntry memory){
//         require(users[msg.sender].totalEntries >= _id, "Id not found!");
//         return passwordEntries[msg.sender][_id-1];
//     }
//     function getUserInfo() public view returns(User memory){
//         return users[msg.sender];
//     }
// }
