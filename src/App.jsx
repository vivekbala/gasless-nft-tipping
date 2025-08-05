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

  // Get the correct MetaMask provider
  const getMetaMaskProvider = () => {
    // If window.ethereum is directly MetaMask
    if (window.ethereum?.isMetaMask) {
      return window.ethereum;
    }
    
    // If there are multiple providers, find MetaMask
    if (window.ethereum?.providers) {
      const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
      if (metamaskProvider) {
        // Set MetaMask as the selected provider
        window.ethereum = metamaskProvider;
        return metamaskProvider;
      }
    }
    
    // If no MetaMask found in providers, check if it's available globally
    if (window.ethereum && !window.ethereum.isMetaMask) {
      // Try to find MetaMask in the providers array
      if (Array.isArray(window.ethereum.providers)) {
        const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
        if (metamaskProvider) {
          window.ethereum = metamaskProvider;
          return metamaskProvider;
        }
      }
    }
    
    return null;
  };

  // Force MetaMask as the selected provider
  const selectMetaMask = async () => {
    if (window.ethereum?.providers) {
      const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
      if (metamaskProvider) {
        // Request to select MetaMask
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        window.ethereum = metamaskProvider;
        return metamaskProvider;
      }
    }
    return null;
  };

  // Connect wallet
  const connectWallet = async () => {
    console.log('Attempting to connect wallet...');
    console.log('window.ethereum exists:', typeof window.ethereum !== 'undefined');
    console.log('window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
    
    // Check if MetaMask is installed (multiple detection methods)
    const isMetaMaskInstalled = typeof window.ethereum !== 'undefined' && 
      (window.ethereum.isMetaMask || window.ethereum.providers?.some(p => p.isMetaMask));
    
    if (isMetaMaskInstalled) {
      try {
        console.log('MetaMask detected, trying direct connection...');
        
        // Try the simplest approach first - direct connection
        let accounts;
        let provider;
        
        try {
          // Try with window.ethereum directly
          console.log('Trying direct window.ethereum connection...');
          accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts'
          });
          provider = window.ethereum;
        } catch (error) {
          console.log('Direct connection failed, trying provider selection...');
          
          // If direct connection fails, try to select MetaMask explicitly
          if (window.ethereum?.providers) {
            const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
            if (metamaskProvider) {
              console.log('Found MetaMask in providers, trying to connect...');
              accounts = await metamaskProvider.request({ 
                method: 'eth_requestAccounts'
              });
              provider = metamaskProvider;
            } else {
              throw new Error('MetaMask not found in providers');
            }
          } else {
            throw new Error('No providers available');
          }
        }
        
        console.log('Accounts received:', accounts);
        
        if (accounts.length === 0) {
          throw new Error('No accounts found. Please unlock MetaMask.');
        }
        
        // Check and switch to Sepolia network
        await checkNetwork();
        
        const ethersProvider = new ethers.providers.Web3Provider(provider);
        const signer = ethersProvider.getSigner();
        
        setProvider(ethersProvider);
        setSigner(signer);
        setAccount(accounts[0]);
        
        // Initialize contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(contract);
        
        // Check if user is a creator
        checkIfCreator(accounts[0]);
        
        console.log('Wallet connected successfully!');
        
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert(`Failed to connect MetaMask: ${error.message}`);
      }
    } else {
      console.log('MetaMask not detected');
      alert('Please install MetaMask!');
    }
  };



  // Check if we're on Sepolia network
  const checkNetwork = async () => {
    const metamaskProvider = getMetaMaskProvider();
    if (metamaskProvider) {
              try {
          const chainId = await metamaskProvider.request({ method: 'eth_chainId' });
        console.log('Current chainId:', chainId);
        console.log('Expected Sepolia chainId: 0xaa36a7');
        
        if (chainId !== '0xaa36a7') { // Sepolia chainId
          try {
            await metamaskProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }], // Sepolia
            });
          } catch (switchError) {
            // If Sepolia is not added, add it
            if (switchError.code === 4902) {
              try {
                await metamaskProvider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0xaa36a7',
                    chainName: 'Sepolia Testnet',
                    nativeCurrency: {
                      name: 'Sepolia Ether',
                      symbol: 'SEP',
                      decimals: 18
                    },
                    rpcUrls: ['https://sepolia.infura.io/v3/cb04fbee83fe4e4991796308a7c4a8e0'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io']
                  }]
                });
              } catch (addError) {
                console.error('Error adding Sepolia network:', addError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking network:', error);
      }
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
      const amount = ethers.utils.parseEther(tipAmount);
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
  // Load creators from blockchain
  const loadCreators = async () => {
    if (!contract) return;
    
    try {
      const creatorsList = [];
      
      // Add you as a creator since you registered
      const yourCreatorData = await contract.creators(account);
      if (yourCreatorData.isRegistered) {
        creatorsList.push({
          address: account,
          name: yourCreatorData.name,
          description: yourCreatorData.description,
          avatar: yourCreatorData.avatar,
          totalTips: yourCreatorData.totalTips.toNumber(),
          totalEarnings: ethers.utils.formatEther(yourCreatorData.totalEarnings)
        });
      }
      
      setCreators(creatorsList);
    } catch (error) {
      console.error('Error loading creators:', error);
      // Fallback to empty list
      setCreators([]);
    }
  };

  // Register a test creator for demo purposes
  const registerTestCreator = async () => {
    if (!contract || !signer) return;
    
    try {
      // Use a different account for testing (this won't work with current setup)
      // For now, let's just show a message
      alert('To test tipping, you would need to register another account as a creator. For now, you can only tip yourself!');
    } catch (error) {
      console.error('Error registering test creator:', error);
    }
  };

  useEffect(() => {
    if (contract && account) {
      loadCreators();
    }
  }, [contract, account]);

  return (
    <div className="app">
      <header className="header">
        <h1>🎨 Gasless NFT Tipping Platform</h1>
        <p>Tip creators with NFTs, gas-free!</p>
        
        {!account ? (
          <div className="wallet-buttons">
            <button onClick={connectWallet} className="connect-btn">
              🔗 Connect MetaMask
            </button>
          </div>
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
              {creators.length === 0 ? (
                <div className="no-creators">
                  <p>No creators found. You're the first one!</p>
                  <button onClick={registerTestCreator} className="test-btn">
                    Add Test Creator
                  </button>
                </div>
              ) : (
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
              )}
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
