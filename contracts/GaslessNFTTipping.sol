// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

contract GaslessNFTTipping is ERC721, ERC2771Context, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    
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
    
    constructor(MinimalForwarder forwarder) 
        ERC721("Gasless NFT Tips", "GNT") 
        ERC2771Context(address(forwarder))
    {}
    
    // Register as a creator
    function registerCreator(string memory _name, string memory _description, string memory _avatar) external {
        require(!creators[_msgSender()].isRegistered, "Creator already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        creators[_msgSender()] = Creator({
            name: _name,
            description: _description,
            avatar: _avatar,
            isRegistered: true,
            totalTips: 0,
            totalEarnings: 0
        });
        
        emit CreatorRegistered(_msgSender(), _name, _description);
    }
    
    // Send a tip (gasless via meta-transaction)
    function sendTip(
        address _creator,
        string memory _message,
        string memory _tokenURI
    ) external payable {
        require(creators[_creator].isRegistered, "Creator not registered");
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(_msgSender() != _creator, "Cannot tip yourself");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
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
            tipper: _msgSender(),
            creator: _creator,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Update mappings
        creatorTips[_creator].push(newTokenId);
        tipperTips[_msgSender()].push(newTokenId);
        
        // Mint NFT to tipper
        _safeMint(_msgSender(), newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        // Transfer funds to creator
        payable(_creator).transfer(creatorAmount);
        
        emit TipSent(_msgSender(), _creator, newTokenId, msg.value, _message);
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
        require(creators[_msgSender()].isRegistered, "Creator not registered");
        
        creators[_msgSender()].name = _name;
        creators[_msgSender()].name = _name;
        creators[_msgSender()].description = _description;
        creators[_msgSender()].avatar = _avatar;
    }
    
    // Override required functions for ERC2771
    function _msgSender() internal view virtual override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }
    
    function _msgData() internal view virtual override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    
    // Override _beforeTokenTransfer for ERC721
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }
    
    // Override _burn for ERC721
    function _burn(uint256 tokenId) internal virtual override(ERC721) {
        super._burn(tokenId);
    }
    
    // Override tokenURI
    function tokenURI(uint256 tokenId) public view virtual override(ERC721) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    // Override supportsInterface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
