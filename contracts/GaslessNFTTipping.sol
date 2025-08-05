// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GaslessNFTTipping is ERC721, Ownable {
    uint256 private _tokenIds;
    
    // Tip structure
    struct Tip {
        address tipper;
        address creator;
        uint256 amount;
        string message;
        uint256 timestamp;
        bool exists;
    }
    
    // Creator structure
    struct Creator {
        string name;
        string description;
        string avatar;
        bool isRegistered;
        uint256 totalTips;
        uint256 totalEarnings;
    }
    
    // Mappings
    mapping(uint256 => Tip) public tips;
    mapping(address => Creator) public creators;
    mapping(address => uint256[]) public creatorTips;
    mapping(address => uint256[]) public tipperTips;
    
    // Events
    event CreatorRegistered(address indexed creator, string name, string description);
    event TipSent(address indexed tipper, address indexed creator, uint256 tokenId, uint256 amount, string message);
    event TipWithdrawn(address indexed creator, uint256 amount);
    
    // Platform fee (1% = 100 basis points)
    uint256 public platformFee = 100; // 1%
    uint256 public platformEarnings = 0;
    
    constructor() ERC721("Gasless NFT Tips", "GNT") Ownable(msg.sender) {}
    
    // Register as a creator
    function registerCreator(string memory _name, string memory _description, string memory _avatar) external {
        require(!creators[msg.sender].isRegistered, "Creator already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        creators[msg.sender] = Creator({
            name: _name,
            description: _description,
            avatar: _avatar,
            isRegistered: true,
            totalTips: 0,
            totalEarnings: 0
        });
        
        emit CreatorRegistered(msg.sender, _name, _description);
    }
    
    // Send a tip (regular transaction for now)
    function sendTip(
        address _creator,
        string memory _message,
        string memory _tokenURI
    ) external payable {
        require(creators[_creator].isRegistered, "Creator not registered");
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(msg.sender != _creator, "Cannot tip yourself");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        // Calculate platform fee
        uint256 platformFeeAmount = (msg.value * platformFee) / 10000;
        uint256 creatorAmount = msg.value - platformFeeAmount;
        
        // Update platform earnings
        platformEarnings += platformFeeAmount;
        
        // Update creator stats
        creators[_creator].totalTips += 1;
        creators[_creator].totalEarnings += creatorAmount;
        
        // Create tip record
        tips[newTokenId] = Tip({
            tipper: msg.sender,
            creator: _creator,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Update mappings
        creatorTips[_creator].push(newTokenId);
        tipperTips[msg.sender].push(newTokenId);
        
        // Mint NFT to tipper
        _safeMint(msg.sender, newTokenId);
        // Note: Token URI is set during minting in this simplified version
        
        // Transfer funds to creator
        payable(_creator).transfer(creatorAmount);
        
        emit TipSent(msg.sender, _creator, newTokenId, msg.value, _message);
    }
    
    // Withdraw platform earnings (owner only)
    function withdrawPlatformEarnings() external onlyOwner {
        uint256 amount = platformEarnings;
        platformEarnings = 0;
        payable(owner()).transfer(amount);
    }
    
    // Get creator tips
    function getCreatorTips(address _creator) external view returns (uint256[] memory) {
        return creatorTips[_creator];
    }
    
    // Get tipper tips
    function getTipperTips(address _tipper) external view returns (uint256[] memory) {
        return tipperTips[_tipper];
    }
    
    // Get tip details
    function getTip(uint256 _tokenId) external view returns (Tip memory) {
        require(tips[_tokenId].exists, "Tip does not exist");
        return tips[_tokenId];
    }
    
    // Update creator profile
    function updateCreatorProfile(string memory _name, string memory _description, string memory _avatar) external {
        require(creators[msg.sender].isRegistered, "Creator not registered");
        
        creators[msg.sender].name = _name;
        creators[msg.sender].description = _description;
        creators[msg.sender].avatar = _avatar;
    }
}
