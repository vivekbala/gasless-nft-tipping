import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'

// Mock contract ABI for demo (you'll replace this with actual ABI)
const CONTRACT_ABI = [
  "function registerCreator(string name, string description, string avatar) external",
  "function sendTip(address creator, string message, string tokenURI) external payable",
  "function creators(address) external view returns (string name, string description, string avatar, bool isRegistered, uint256 totalTips, uint256 totalEarnings)",
  "function getCreatorTips(address creator) external view returns (uint256[])",
  "function getTip(uint256 tokenId) external view returns (address tipper, address creator, uint256 amount, string message, uint256 timestamp, bool exists)"
];

const CONTRACT_ADDRESS = "0x7095525D45aFE9245C98923Fa802D080a4971c17"; // Deployed on Sepolia

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [creators, setCreators] = useState([]);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [creatorForm, setCreatorForm] = useState({
    name: '',
    description: '',
    avatar: ''
  });

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        
        // Initialize contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(contract);
        
        // Check if user is a creator
        checkIfCreator(accounts[0]);
        
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  // Check if user is registered as creator
  const checkIfCreator = async (address) => {
    if (!contract) return;
    
    try {
      const creator = await contract.creators(address);
      setIsCreator(creator.isRegistered);
    } catch (error) {
      console.error('Error checking creator status:', error);
    }
  };

  // Register as creator
  const registerCreator = async () => {
    if (!contract || !creatorForm.name) return;
    
    try {
      const tx = await contract.registerCreator(
        creatorForm.name,
        creatorForm.description,
        creatorForm.avatar
      );
      await tx.wait();
      setIsCreator(true);
      alert('Successfully registered as creator!');
    } catch (error) {
      console.error('Error registering creator:', error);
      alert('Failed to register as creator');
    }
  };

  // Send tip
  const sendTip = async () => {
    if (!contract || !selectedCreator || !tipAmount || !tipMessage) return;
    
    try {
      const amount = ethers.parseEther(tipAmount);
      const tokenURI = `https://api.example.com/tips/${Date.now()}`; // Generate unique URI
      
      const tx = await contract.sendTip(
        selectedCreator.address,
        tipMessage,
        tokenURI,
        { value: amount }
      );
      await tx.wait();
      
      alert('Tip sent successfully! You received an NFT.');
      setTipAmount('');
      setTipMessage('');
    } catch (error) {
      console.error('Error sending tip:', error);
      alert('Failed to send tip');
    }
  };

  // Mock creators data for demo
  useEffect(() => {
    setCreators([
      {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Alice Artist',
        description: 'Digital artist creating unique NFTs',
        avatar: 'https://via.placeholder.com/100',
        totalTips: 15,
        totalEarnings: '2.5'
      },
      {
        address: '0x2345678901234567890123456789012345678901',
        name: 'Bob Builder',
        description: 'Smart contract developer and educator',
        avatar: 'https://via.placeholder.com/100',
        totalTips: 8,
        totalEarnings: '1.2'
      },
      {
        address: '0x3456789012345678901234567890123456789012',
        name: 'Carol Creator',
        description: 'Content creator and crypto enthusiast',
        avatar: 'https://via.placeholder.com/100',
        totalTips: 23,
        totalEarnings: '4.1'
      }
    ]);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🎨 Gasless NFT Tipping Platform</h1>
        <p>Tip creators with NFTs, gas-free!</p>
        
        {!account ? (
          <button onClick={connectWallet} className="connect-btn">
            🔗 Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
            {isCreator && <span className="creator-badge">👑 Creator</span>}
          </div>
        )}
      </header>

      <main className="main">
        {!account ? (
          <div className="welcome">
            <h2>Welcome to Gasless NFT Tipping!</h2>
            <p>Connect your wallet to start tipping creators with NFTs, completely gas-free.</p>
          </div>
        ) : (
          <div className="content">
            {/* Creator Registration */}
            {!isCreator && (
              <div className="creator-registration">
                <h3>Register as a Creator</h3>
                <div className="form">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={creatorForm.name}
                    onChange={(e) => setCreatorForm({...creatorForm, name: e.target.value})}
                  />
                  <textarea
                    placeholder="Description"
                    value={creatorForm.description}
                    onChange={(e) => setCreatorForm({...creatorForm, description: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Avatar URL"
                    value={creatorForm.avatar}
                    onChange={(e) => setCreatorForm({...creatorForm, avatar: e.target.value})}
                  />
                  <button onClick={registerCreator} className="register-btn">
                    Register as Creator
                  </button>
                </div>
              </div>
            )}

            {/* Creators List */}
            <div className="creators-section">
              <h3>Discover Creators</h3>
              <div className="creators-grid">
                {creators.map((creator, index) => (
                  <div key={index} className="creator-card">
                    <img src={creator.avatar} alt={creator.name} className="creator-avatar" />
                    <h4>{creator.name}</h4>
                    <p>{creator.description}</p>
                    <div className="creator-stats">
                      <span>💎 {creator.totalTips} tips</span>
                      <span>💰 {creator.totalEarnings} ETH earned</span>
                    </div>
                    <button 
                      onClick={() => setSelectedCreator(creator)}
                      className="tip-btn"
                    >
                      Send Tip
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tip Modal */}
            {selectedCreator && (
              <div className="modal-overlay" onClick={() => setSelectedCreator(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Tip {selectedCreator.name}</h3>
                  <div className="tip-form">
                    <input
                      type="number"
                      placeholder="Amount (ETH)"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      step="0.001"
                      min="0.001"
                    />
                    <textarea
                      placeholder="Message (optional)"
                      value={tipMessage}
                      onChange={(e) => setTipMessage(e.target.value)}
                    />
                    <div className="tip-actions">
                      <button onClick={() => setSelectedCreator(null)} className="cancel-btn">
                        Cancel
                      </button>
                      <button onClick={sendTip} className="send-tip-btn">
                        Send Tip & Get NFT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App
