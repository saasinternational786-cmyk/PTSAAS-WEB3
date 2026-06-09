import { useState, useEffect } from "react";
import { ethers, BrowserProvider } from "ethers";
import { Alchemy, Network } from "alchemy-sdk";
import { QRCodeCanvas } from "qrcode.react";
import { Buffer } from "buffer";
window.Buffer = buffer;
import { supabase } from "./supabase";

// Configure Global Buffer Polyfill
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// Alchemy SDK Configuration
const alchemyConfig = {
  apiKey: "bDA0NQbejxa9L0QokVikw", 
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(alchemyConfig);

function App() {
  const COMPANY_WALLET = "0x6A9C88613B15117a11C6FEff5784Ed9bBA5Aa1F3";

  // State Management
  const [orders, setOrders] = useState([]);
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [page, setPage] = useState("home");
  const [balance, setBalance] = useState("0");
  const [otcType, setOtcType] = useState("Buy ETH");
  const [otcAmount, setOtcAmount] = useState("");
  const [otcWallet, setOtcWallet] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [kycRequests, setKycRequests] = useState([]); 
  const [users, setUsers] = useState([]);
  const [kycStatus, setKycStatus] = useState("Not Submitted");
  const [wallet, setWallet] = useState(null);
  
  // Deposit States
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTxHash, setDepositTxHash] = useState("");
  const [selectedCoin, setSelectedCoin] = useState("USDT");
  const [depositRequests, setDepositRequests] = useState([]);

  // Alchemy Blockchain Exploration Utilities State
  const [searchAddress, setSearchAddress] = useState("");
  const [searchTx, setSearchTx] = useState("");
  const [walletEthBalance, setWalletEthBalance] = useState("0");

  // Unified Admin Dashboard Global Stats Counter State
  const [stats, setStats] = useState({
    users: 0,
    orders: 0,
    deposits: 0,
    pendingKYC: 0,
    volume: 0
  });

  const provider = new ethers.JsonRpcProvider(
    `https://eth-mainnet.g.alchemy.com/v2/${alchemyConfig.apiKey}`
  );

  // -----------------------------------------------------
  // Third-Party Utility Notifications (EmailJS Dummy Setup)
  // -----------------------------------------------------
  const sendEmailNotification = async (targetEmail, subject, message) => {
    try {
      console.log(`Email mock dispatched to ${targetEmail}. Subject: ${subject}. Message: ${message}`);
    } catch (err) {
      console.error("Email notification dispatch failed:", err);
    }
  };

  // -----------------------------------------------------
  // Core Business Database Processing Operations
  // -----------------------------------------------------
  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("otc_orders")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      setOrders(data);
    } else {
      console.error("Error loading orders:", error);
    }
  };

  const loadKYCRequests = async () => {
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setKycRequests(data);
    } else {
      console.error("Error loading KYC:", error);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");

    console.log("Profiles:", data);
    console.log("Profile Error:", error);

    if (!error) {
      setUsers(data || []);
    }
  };

  const loadDeposits = async () => {
    const { data, error } = await supabase
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDepositRequests(data);
    } else {
      console.error("Error loading deposits:", error);
    }
  };

  const loadWallet = async (currentUser) => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();

    if (!error && data) {
      setWallet(data);
    }
  };

  const checkKYCStatus = async (currentUser) => {
    if (!currentUser) {
      setKycStatus("Not Submitted");
      return;
    }
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      setKycStatus("Not Submitted");
      return;
    }

    setKycStatus(data[0].status);
  };

  const loadAdminStats = async () => {
    const { count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: ordersCount } = await supabase
      .from("otc_orders")
      .select("*", { count: "exact", head: true });

    const { count: depositsCount } = await supabase
      .from("deposits")
      .select("*", { count: "exact", head: true });

    const { count: pendingKYCCount } = await supabase
      .from("kyc_documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending");

    setStats({
      users: usersCount || 0,
      orders: ordersCount || 0,
      deposits: depositsCount || 0,
      pendingKYC: pendingKYCCount || 0,
      volume: 0
    });
  };

  // -----------------------------------------------------
  // User Authentication & KYC Submissions
  // -----------------------------------------------------
  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile?.status === "Blocked") {
      alert("Account Blocked");
      await supabase.auth.signOut();
      return;
    }

    setUser(data.user);
    alert("Login Success");
    checkKYCStatus(data.user);
    loadWallet(data.user);
  };

  const register = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }
    
    if (data?.user) {
      await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            status: "Active",
            role: "Client"
          }
        ]);

      await supabase
        .from("wallets")
        .insert({
          user_id: data.user.id,
          usd_balance: 0,
          usdt_balance: 0,
          eth_balance: 0
        });
    }
    alert("Registration Success");
  };

  const uploadKYC = async () => {
    if (!passportFile || !idFile) {
      alert("Please select both files");
      return;
    }

    try {
      const authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        alert("Please login first");
        return;
      }

      const passportName = Date.now() + "_" + passportFile.name;
      const idName = Date.now() + "_" + idFile.name;

      const { data: passportData, error: passportError } = await supabase.storage
        .from("KYC")
        .upload(passportName, passportFile);

      if (passportError) throw passportError;

      const { data: idData, error: idError } = await supabase.storage
        .from("KYC")
        .upload(idName, idFile);

      if (idError) throw idError;

      const { error: kycError } = await supabase
        .from("kyc_documents")
        .insert([
          {
            user_id: authUser.id,
            passport_url: passportData.path,
            idcard_url: idData.path,
            status: "Pending"
          }
        ]);

      if (kycError) throw kycError;

      alert("KYC Uploaded Successfully");
      checkKYCStatus(authUser);
    } catch (error) {
      alert(error.message);
    }
  };

  // -----------------------------------------------------
  // Trading Systems & Order Settlement Mechanics
  // -----------------------------------------------------
  const saveOTCRequest = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }
    
    // Evaluate OTC user privilege status criteria parameters
    if (kycStatus === "Approved" && wallet?.usdt_balance > 0) {
      console.log("OTC Core privileges unlocked and verified.");
    } else if (kycStatus !== "Approved") {
      alert("Trading Blocked: KYC must be approved first.");
      return;
    }

    const { error } = await supabase.from("otc_orders").insert([
      {
        order_id: "OTC-" + Date.now(),
        wallet_address: otcWallet || walletAddress, 
        user_id: user?.id || null,
        coin: otcType,
        amount: otcAmount,
        type: otcType.toUpperCase().includes("BUY") ? "BUY" : "SELL",
        status: "Pending",
      },
    ]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("OTC Request Saved Successfully");
      setOtcAmount(""); 
      setOtcWallet("");
      loadOrders();
      setTimeout(() => matchOrdersEngine(), 1500);
    }
  };

  const settleTrade = async (buyOrder, sellOrder) => {
    try {
      const amountValue = Number(buyOrder.amount);
      const coinValue = buyOrder.coin;

      const { data: buyerWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", buyOrder.user_id)
        .single();

      const { data: sellerWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", sellOrder.user_id)
        .single();

      if (coinValue.toUpperCase().includes("USDT") && buyerWallet && sellerWallet) {
        await supabase
          .from("wallets")
          .update({ usdt_balance: Number(buyerWallet.usdt_balance) + amountValue })
          .eq("user_id", buyOrder.user_id);

        await supabase
          .from("wallets")
          .update({ usdt_balance: Number(sellerWallet.usdt_balance) - amountValue })
          .eq("user_id", sellOrder.user_id);
      }

      await supabase
        .from("otc_orders")
        .update({ status: "Completed" })
        .in("id", [buyOrder.id, sellOrder.id]);

      loadOrders();
    } catch (err) {
      console.error("Trade Settlement engine crash: ", err);
    }
  };

  const matchOrdersEngine = async () => {
    const { data: buyOrders } = await supabase
      .from("otc_orders")
      .select("*")
      .eq("type", "BUY")
      .eq("status", "Pending");

    const { data: sellOrders } = await supabase
      .from("otc_orders")
      .select("*")
      .eq("type", "SELL")
      .eq("status", "Pending");

    if (!buyOrders || !sellOrders) return;

    for (const buy of buyOrders) {
      const sell = sellOrders.find(
        s => s.coin === buy.coin && Number(s.amount) === Number(buy.amount)
      );

      if (!sell) continue;

      await supabase.from("otc_orders").update({ status: "Matched" }).eq("id", buy.id);
      await supabase.from("otc_orders").update({ status: "Matched" }).eq("id", sell.id);

      await settleTrade(buy, sell);
    }
  };

  // -----------------------------------------------------
  // Ledger Deposit Systems & Automated Verification
  // -----------------------------------------------------
  const submitDeposit = async () => {
    const { error } = await supabase
      .from("deposits")
      .insert([
        {
          wallet_address: walletAddress,
          coin: selectedCoin,
          amount: depositAmount,
          tx_hash: depositTxHash,
          status: "pending"
        }
      ]);

    if (!error) {
      alert("Deposit Submitted");
      const txToVerify = depositTxHash;
      setDepositAmount("");
      setDepositTxHash("");
      loadDeposits();
      
      setTimeout(() => verifyDepositBlockchainAutomated(txToVerify, user?.id, selectedCoin, depositAmount), 2000);
    } else {
      alert(error.message);
    }
  };

  const verifyDepositBlockchainAutomated = async (txHashStr, userId, targetCoin, amountVal) => {
    try {
      let verified = false;
      const tx = await alchemy.core.getTransaction(txHashStr);
      
      if (tx && tx.to.toLowerCase() === COMPANY_WALLET.toLowerCase()) {
        console.log("Transaction Found via Alchemy Core Package Engine");
        
        const receipt = await alchemy.core.getTransactionReceipt(txHashStr);
        if (receipt && receipt.status === 1) {
          verified = true;
          console.log("Transaction Receipt Status successfully verified.");

          await supabase
            .from("deposits")
            .update({
              status: "verified",
              reviewed_at: new Date().toISOString()
            })
            .eq("tx_hash", txHashStr);

          if (userId) {
            await creditWallet(walletAddress, amountVal, targetCoin);
          }

          loadDeposits();
          if (user) loadWallet(user);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error("Alchemy Automated verification failed:", e);
      return false;
    }
  };

  const creditWallet = async (targetWalletAddr, amountVal, targetCoin) => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (!error && data && targetCoin === "USDT") {
      await supabase
        .from("wallets")
        .update({
          usdt_balance: Number(data.usdt_balance || 0) + Number(amountVal)
        })
        .eq("user_id", user?.id);
    } else if (!error && data && targetCoin === "ETH") {
      await supabase
        .from("wallets")
        .update({
          eth_balance: Number(data.eth_balance || 0) + Number(amountVal)
        })
        .eq("user_id", user?.id);
    }
  };

  const approveDeposit = async (id) => {
    await supabase
      .from("deposits")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id);

    alert("Deposit Approved");
    loadDeposits();
    if (user) loadWallet(user);
  };

  // -----------------------------------------------------
  // Operations Management Controls (Admin Actions)
  // -----------------------------------------------------
  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase
      .from("otc_orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      alert("Order updated successfully");
      loadOrders();
    }
  };

  const approveOrder = async (order) => {
    await supabase
      .from("otc_orders")
      .update({ status: "Approved" })
      .eq("id", order.id);

    const walletResult = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", order.user_id)
      .single();

    if (walletResult.data) {
      await supabase
        .from("wallets")
        .update({
          usdt_balance: Number(walletResult.data.usdt_balance || 0) + Number(order.amount),
          eth_balance: Number(walletResult.data.eth_balance || 0) + Number(order.amount)
        })
        .eq("user_id", order.user_id);
    }

    loadOrders();
  };

  const rejectOrder = async (orderId) => {
    await supabase
      .from("otc_orders")
      .update({ status: "Rejected" })
      .eq("id", orderId);

    loadOrders();
  };

  const approveKYC = async (id) => {
    const { error } = await supabase
      .from("kyc_documents")
      .update({ status: "Approved" })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      loadKYCRequests();
    }
  };

  const rejectKYC = async (id) => {
    const { error } = await supabase
      .from("kyc_documents")
      .update({ status: "Rejected" })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      loadKYCRequests();
    }
  };

  const updateUserStatus = async (id, status) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", id);

    if (!error) {
      alert("User profile status updated");
      loadUsers();
    } else {
      alert("Error updating user status");
    }
  };

  const adminLogin = async () => {
    const passwordInput = prompt("Enter Admin Password");

    if (passwordInput === "PTSAAS2026") {
      if (user) {
        const profileResult = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileResult.data?.role === "Admin") {
          setIsAdmin(true);
        }
      }
      setIsAdmin(true); 
      setPage("admin");
      loadAdminStats();
    } else {
      alert("Access Denied");
    }
  };

  // -----------------------------------------------------
  // Web3 Utility Integration Components & Market Explorers
  // -----------------------------------------------------
  const testAlchemy = async () => {
    try {
      const blockNumber = await provider.getBlockNumber();
      alert("Alchemy Connected! Latest Block: " + blockNumber);
    } catch (error) {
      console.error("Alchemy Error:", error);
      alert("Alchemy Connection Failed");
    }
  };

  const testBybit = async () => {
    try {
      const response = await fetch("https://api.bybit.com/v5/market/time");
      const data = await response.json();
      console.log("BYBIT RESPONSE:", data);

      if (data.retCode === 0) {
        alert("Bybit Connected Successfully");
      } else {
        alert("Bybit Connection Failed");
      }
      return data;
    } catch (error) {
      console.error(error);
      alert("Bybit Connection Pipeline Error");
    }
  };

  const checkCompanyBalance = async () => {
    try {
      const balanceWei = await provider.getBalance(COMPANY_WALLET);
      const balanceEth = ethers.formatEther(balanceWei);
      alert("Company Balance: " + balanceEth + " ETH");
    } catch (error) {
      console.error(error);
      alert("Balance Check Failed");
    }
  };

  const checkWalletBalance = async () => {
    try {
      if (!walletAddress) {
        alert("Connect wallet first");
        return;
      }
      const balanceWei = await provider.getBalance(walletAddress);
      const balanceEth = ethers.formatEther(balanceWei);
      setWalletEthBalance(balanceEth);
      alert("Wallet Balance: " + balanceEth + " ETH");
    } catch (error) {
      console.error(error);
      alert("Balance Check Failed");
    }
  };

  const lookupTransaction = async () => {
    try {
      if (!searchTx) {
        alert("Enter Transaction Hash");
        return;
      }
      const tx = await alchemy.core.getTransaction(searchTx);
      console.log("Transaction Details via Alchemy SDK:", tx);

      if (!tx) {
        alert("Transaction not found on-chain");
        return;
      }
      alert(`Transaction Found\nFrom: ${tx.from}\nTo: ${tx.to}\nValue: ${ethers.formatEther(tx.value || 0)} ETH`);
    } catch (error) {
      console.error(error);
      alert("Lookup Failed");
    }
  };

  const checkAddressActivity = async () => {
    try {
      const addressToQuery = searchAddress || walletAddress;
      if (!addressToQuery) {
        alert("Please provide or connect a wallet address first.");
        return;
      }
      
      const count = await provider.getTransactionCount(addressToQuery);
      
      const transfers = await alchemy.core.getAssetTransfers({
        fromBlock: "0x0",
        toAddress: addressToQuery,
        category: ["external", "erc20"]
      });
      console.log("Alchemy Asset Transfers History Payload:", transfers);

      alert(`Transaction Count: ${count}\nAsset Transfers Loaded: ${transfers.transfers.length}`);
    } catch (error) {
      console.error(error);
      alert("Activity Query Failed");
    }
  };

  const scanTokenBalances = async () => {
    try {
      const addressToQuery = searchAddress || walletAddress;
      if (!addressToQuery) {
        alert("Connect wallet or enter address target.");
        return;
      }
      const tokens = await alchemy.core.getTokenBalances(addressToQuery);
      console.log("Alchemy Token Balances Result:", tokens);
      alert(`Token balances scanned. Found ${tokens.tokenBalances.length} distinct asset allocations. Check dev logs.`);
    } catch (error) {
      console.error(error);
      alert("Token balance scan dropped execution.");
    }
  };

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    alert("Address Copied");
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const browserProvider = new BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();
        
        setWalletAddress(address);
        setWalletConnected(true);

        const weiBalance = await provider.getBalance(address);
        const ethBalance = ethers.formatEther(weiBalance);
        setBalance(Number(ethBalance).toFixed(4));
        alert("Wallet Connected");
      } else {
        alert("Please install MetaMask or Trust Wallet");
      }
    } catch (error) {
      console.error(error);
      alert("Wallet connection failed");
    }
  };

  const sendPayment = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }
      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      
      setTxStatus("Requesting approval...");
      const tx = await signer.sendTransaction({
        to: receiverAddress,
        value: ethers.parseEther(amount),
      });

      setTxHash(tx.hash);
      setTxStatus("Transaction Submitted... Waiting confirmation");

      await tx.wait();
      setTxStatus("Payment Sent Successfully");
      setAmount("");
      setReceiverAddress("");
    } catch (error) {
      console.error(error);
      setTxStatus("Transaction Failed");
    }
  };

  useEffect(() => {
    loadOrders();
    loadKYCRequests();
    loadUsers();
    loadDeposits();

    const channel = supabase
      .channel("otc-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "otc_orders",
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkKYCStatus(user);
      loadWallet(user);
    }
  }, [user]);

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        color: "white",
        minHeight: "100vh",
        textAlign: "center",
        fontFamily: "sans-serif",
        paddingBottom: "40px"
      }}
    >
      {/* Navigation Bar */}
      <nav style={{ display: "flex", justifyContent: "center", gap: "15px", padding: "20px", flexWrap: "wrap" }}>
        <button onClick={() => setPage("home")}>Home</button>
        <button onClick={() => setPage("otc")}>OTC</button>
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("wallet")}>Wallet</button>
        <button onClick={testAlchemy}>Test Alchemy</button>
        <button onClick={checkCompanyBalance}>Check Company Balance</button>
        <button onClick={adminLogin}>Admin</button>
        <button onClick={() => setPage("history")}>My Orders</button>
        <button onClick={() => setPage("login")}>Login</button>
      </nav>

      {/* HOME PAGE */}
      {page === "home" && (
        <div style={{ paddingTop: "40px" }}>
          <h1 style={{ fontSize: "60px", color: "#fbbf24" }}>PT SAAS WEB3</h1>
          <h2 style={{ color: "#38bdf8" }}>Future of Blockchain & AI</h2>
          <p style={{ color: "#cbd5e1", fontSize: "20px" }}>Decentralized • Secure • Global</p>
          
          <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "20px" }}>
            <button
              onClick={connectWallet}
              style={{
                padding: "12px 25px",
                background: "#fbbf24",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Connect Wallet
            </button>

            <button
              onClick={testBybit}
              style={{
                padding: "12px 25px",
                background: "#f7a600",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Test Bybit
            </button>
          </div>

          <div
            style={{
              background: "#1e293b",
              padding: "20px",
              borderRadius: "10px",
              marginTop: "40px",
              width: "80%",
              maxWidth: "700px",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            <h2>RECEIVER DETAILS</h2>
            <p><b>1. Domain:</b> ptsaasweb3.com</p>
            <p><b>2. Server IP:</b> 123.45.67.89</p>
            <p><b>3. Connected Wallet:</b> {walletAddress || "Not Connected"}</p>
            <p><b>4. Network:</b> Ethereum Mainnet</p>
            <p><b>5. Status:</b> {walletConnected ? "Connected" : "Not Connected"}</p>
            <p><b>6. ETH Balance:</b> {balance} ETH</p>
          </div>
        </div>
      )}

      {/* LOGIN PAGE */}
      {page === "login" && (
        <div style={{ marginTop: "40px" }}>
          <h2>Login / Register</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "80%", maxWidth: "400px", padding: "12px", borderRadius: "8px", color: "black" }}
          />
          <br /><br />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "80%", maxWidth: "400px", padding: "12px", borderRadius: "8px", color: "black" }}
          />
          <br /><br />
          <button onClick={login} style={{ padding: "12px 25px", borderRadius: "8px", cursor: "pointer" }}>
            Login
          </button>
          <button onClick={register} style={{ padding: "12px 25px", borderRadius: "8px", marginLeft: "10px", cursor: "pointer" }}>
            Register
          </button>
          
          <h3 style={{ marginTop: "40px" }}>KYC Upload</h3>
          <div style={{ background: "#1e293b", padding: "20px", borderRadius: "10px", width: "80%", maxWidth: "400px", margin: "20px auto" }}>
            <p style={{ textAlign: "left", margin: "0 0 5px 0" }}>Passport File:</p>
            <input
              type="file"
              onChange={(e) => setPassportFile(e.target.files[0])}
              style={{ width: "100%", marginBottom: "15px" }}
            />
            <p style={{ textAlign: "left", margin: "0 0 5px 0" }}>ID Card File:</p>
            <input
              type="file"
              onChange={(e) => setIdFile(e.target.files[0])}
              style={{ width: "100%", marginBottom: "20px" }}
            />
            <button onClick={uploadKYC} style={{ padding: "10px 20px", borderRadius: "6px", backgroundColor: "#fbbf24", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer", width: "100%" }}>
              Upload KYC
            </button>
          </div>

          <h2>Users List</h2>
          <table border="1" style={{ width: "80%", margin: "20px auto", borderCollapse: "collapse", borderColor: "#334155" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b" }}>
                <th style={{ padding: "10px" }}>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: "10px" }}>{u.email}</td>
                  <td>{u.status}</td>
                  <td>
                    <button onClick={() => updateUserStatus(u.id, "Active")}>Activate</button>
                    <button onClick={() => updateUserStatus(u.id, "Blocked")} style={{ marginLeft: "10px" }}>Block</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {user && <p style={{ color: "#22c55e", marginTop: "20px" }}>Logged in as: {user.email}</p>}
        </div>
      )}

      {/* DASHBOARD PAGE */}
      {page === "dashboard" && (
        <div style={{ marginTop: "40px" }}>
          <h2>Dashboard</h2>
          <h3>Wallet Status</h3>
          <p>{walletConnected ? "Connected Successfully" : "Wallet Not Connected"}</p>
          <h3>Account Address</h3>
          <p>{walletAddress || "No Address"}</p>
          <h3>Network</h3>
          <p>Ethereum Mainnet</p>
          <h3>ETH Balance</h3>
          <p>{balance} ETH</p>

          <hr style={{ borderColor: "#334155", margin: "30px auto", width: "80%" }} />
          <h2>Internal System Wallet Balance</h2>
          <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", display: "inline-block", minWidth: "250px" }}>
            <h3>USD: {wallet?.usd_balance ?? 0}</h3>
            <h3>USDT: {wallet?.usdt_balance ?? 0}</h3>
            <h3>ETH: {wallet?.eth_balance ?? 0}</h3>
          </div>

          <hr style={{ borderColor: "#334155", margin: "30px auto", width: "80%" }} />
          <h2>Alchemy Blockchain Diagnostics Engine</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "450px", margin: "0 auto" }}>
            <button onClick={checkWalletBalance}>Query Wallet Live Balance</button>
            <button onClick={scanTokenBalances}>Scan Token Allocation Distribution</button>
            <h3>Live Node Balance Target: {walletEthBalance} ETH</h3>

            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px" }}>
              <h4>Lookup Network Transaction</h4>
              <input 
                type="text" 
                placeholder="Transaction Hash Identifier" 
                value={searchTx} 
                onChange={(e) => setSearchTx(e.target.value)} 
                style={{ width: "90%", padding: "8px", borderRadius: "4px", color: "black", marginBottom: "10px" }}
              />
              <button onClick={lookupTransaction}>Scan Audit Trail</button>
            </div>

            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px" }}>
              <h4>Verify Target Address Payload Activity</h4>
              <input 
                type="text" 
                placeholder="Wallet Public Key Target string" 
                value={searchAddress} 
                onChange={(e) => setSearchAddress(e.target.value)} 
                style={{ width: "90%", padding: "8px", borderRadius: "4px", color: "black", marginBottom: "10px" }}
              />
              <button onClick={checkAddressActivity}>Query Action Sequence Summary Counter</button>
            </div>
          </div>
        </div>
      )}

      {/* WALLET PAGE */}
      {page === "wallet" && (
        <div style={{ marginTop: "40px" }}>
          <h2>Wallet Management</h2>
          {walletAddress ? (
            <div style={{ maxWidth: "500px", margin: "0 auto" }}>
              <p style={{ wordBreak: "break-all" }}>{walletAddress}</p>
              <div style={{ background: "white", padding: "20px", display: "inline-block", borderRadius: "10px", marginTop: "20px" }}>
                <QRCodeCanvas value={walletAddress} size={200} />
              </div>
              <p style={{ marginTop: "10px" }}>Scan QR to send crypto</p>
              <button onClick={copyAddress} style={{ padding: "10px 20px", margin: "15px 0", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "#fbbf24", color: "#000", fontWeight: "bold" }}>
                Copy Address
              </button>

              <hr style={{ borderColor: "#334155", margin: "30px 0" }} />

              <h2>Send Payment</h2>
              <input type="text" placeholder="Receiver Address" value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} style={{ width: "80%", padding: "12px", marginTop: "10px", borderRadius: "8px", color: "black" }} />
              <br />
              <input type="text" placeholder="Amount ETH" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "80%", padding: "12px", marginTop: "10px", borderRadius: "8px", color: "black" }} />
              <br />
              <button onClick={sendPayment} style={{ padding: "12px 25px", marginTop: "15px", borderRadius: "8px", border: "none", backgroundColor: "#22c55e", color: "white", fontWeight: "bold", cursor: "pointer" }}>
                Send ETH
              </button>

              <hr style={{ borderColor: "#334155", margin: "30px 0" }} />
              
              <h2>Submit Native Deposit Ledger Entry</h2>
              <select value={selectedCoin} onChange={(e) => setSelectedCoin(e.target.value)} style={{ padding: "10px", borderRadius: "8px", color: "black", width: "84%" }}>
                <option value="USDT">USDT</option>
                <option value="ETH">ETH</option>
              </select>
              <br />
              <input type="number" placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ width: "80%", padding: "12px", marginTop: "10px", borderRadius: "8px", color: "black" }} />
              <br />
              <input type="text" placeholder="Tx Hash Verification" value={depositTxHash} onChange={(e) => setDepositTxHash(e.target.value)} style={{ width: "80%", padding: "12px", marginTop: "10px", borderRadius: "8px", color: "black" }} />
              <br />
              <button onClick={submitDeposit} style={{ padding: "12px 25px", marginTop: "15px", borderRadius: "8px", border: "none", backgroundColor: "#fbbf24", color: "black", fontWeight: "bold", cursor: "pointer" }}>
                Submit Deposit
              </button>

              {txStatus && <p style={{ color: "#fbbf24", marginTop: "20px", fontWeight: "bold" }}>{txStatus}</p>}
              {txHash && <p style={{ fontSize: "12px", color: "#38bdf8" }}>TX: {txHash}</p>}
            </div>
          ) : (
            <p>Please connect wallet first on the Home page.</p>
          )}
        </div>
      )}

      {/* OTC PAGE */}
      {page === "otc" && (
        kycStatus !== "Approved" ? (
          <div style={{ marginTop: "40px" }}>
            <h2>KYC Verification Required</h2>
            <p>Your KYC must be approved before submitting OTC orders.</p>
            <p>Current Status: <b>{kycStatus}</b></p>
          </div>
        ) : (
          <div style={{ marginTop: "40px" }}>
            <h2>OTC Orders System</h2>
            <select value={otcType} onChange={(e) => setOtcType(e.target.value)} style={{ padding: "10px", borderRadius: "8px", marginTop: "10px", color: "black" }}>
              <option>Buy ETH</option>
              <option>Sell ETH</option>
              <option>Buy USDT</option>
              <option>Sell USDT</option>
            </select>
            <br /><br />
            <input type="text" placeholder="Amount (USD)" value={otcAmount} onChange={(e) => setOtcAmount(e.target.value)} style={{ width: "80%", maxWidth: "400px", padding: "12px", borderRadius: "8px", color: "black" }} />
            <br /><br />
            <input type="text" placeholder="Custom Payout Wallet Address (Optional)" value={otcWallet} onChange={(e) => setOtcWallet(e.target.value)} style={{ width: "80%", maxWidth: "400px", padding: "12px", borderRadius: "8px", color: "black" }} />
            <br /><br />
            <button onClick={saveOTCRequest} style={{ padding: "12px 25px", borderRadius: "8px", border: "none", backgroundColor: "#fbbf24", fontWeight: "bold", cursor: "pointer" }}>
              Submit OTC Request
            </button>

            <h3 style={{ marginTop: "40px" }}>Active OTC Orders History</h3>
            <p>Total Orders: {orders.length}</p>
            
            <table border="1" style={{ margin: "20px auto", width: "90%", maxWidth: "800px", borderCollapse: "collapse", borderColor: "#334155" }}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b" }}>
                  <th style={{ padding: "10px" }}>Order ID</th>
                  <th>Wallet</th>
                  <th>Coin</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "10px" }}>No OTC orders found.</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ padding: "10px" }}>{order.order_id}</td>
                      <td style={{ fontSize: "12px" }}>{order.wallet_address}</td>
                      <td>{order.coin}</td>
                      <td>{order.amount}</td>
                      <td style={{ color: order.status === "Pending" ? "orange" : order.status === "Rejected" ? "red" : "lightgreen" }}>
                        {order.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ADMIN DASHBOARD PAGE */}
      {page === "admin" && isAdmin && (
        <div style={{ marginTop: "40px" }}>
          <h2>Admin Dashboard</h2>
          
          {/* Admin Realtime Summary Cards Widget */}
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", margin: "20px auto", maxWidth: "95%" }}>
            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", minWidth: "150px" }}>
              Total Users
              <h2>{stats.users}</h2>
            </div>
            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", minWidth: "150px" }}>
              OTC Orders
              <h2>{stats.orders}</h2>
            </div>
            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", minWidth: "150px" }}>
              Deposits Loaded
              <h2>{stats.deposits}</h2>
            </div>
            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", minWidth: "150px" }}>
              Pending KYC
              <h2>{stats.pendingKYC}</h2>
            </div>
          </div>
          
          <h3>KYC Requests History ({kycRequests.length})</h3>
          <table border="1" style={{ width: "95%", margin: "20px auto", borderCollapse: "collapse", borderColor: "#334155" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b" }}>
                <th style={{ padding: "10px" }}>User ID</th>
                <th>Passport Document</th>
                <th>ID Card Document</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kycRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "10px" }}>No KYC Requests Found</td>
                </tr>
              ) : (
                kycRequests.map((kyc) => (
                  <tr key={kyc.id}>
                    <td style={{ padding: "10px", fontSize: "12px" }}>{kyc.user_id}</td>
                    <td>
                      <a href={`https://pmgzelvunpbybbyfmxmv.supabase.co/storage/v1/object/public/KYC/${kyc.passport_url}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                        View Passport
                      </a>
                    </td>
                    <td>
                      <a href={`https://pmgzelvunpbybbyfmxmv.supabase.co/storage/v1/object/public/KYC/${kyc.idcard_url}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                        View ID Card
                      </a>
                    </td>
                    <td style={{ color: kyc.status === "Pending" ? "orange" : kyc.status === "Rejected" ? "red" : "lightgreen" }}>
                      {kyc.status}
                    </td>
                    <td>
                      <button onClick={() => approveKYC(kyc.id)}>Approve</button>
                      <button onClick={() => rejectKYC(kyc.id)} style={{ marginLeft: "10px" }}>Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ marginTop: "40px" }}>Deposit Proofs Processing ({depositRequests.length})</h3>
          <table border="1" style={{ width: "95%", margin: "20px auto", borderCollapse: "collapse", borderColor: "#334155" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b" }}>
                <th style={{ padding: "10px" }}>User ID</th>
                <th>Amount</th>
                <th>Coin</th>
                <th>Tx Hash / Proof Link</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {depositRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "10px" }}>No deposits loaded.</td>
                </tr>
              ) : (
                depositRequests.map((dep) => (
                  <tr key={dep.id}>
                    <td style={{ padding: "10px", fontSize: "12px" }}>{dep.user_id || "Guest"}</td>
                    <td>{dep.amount}</td>
                    <td>{dep.coin || "USD"}</td>
                    <td><a href={dep.tx_hash || dep.proof_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>View Reference</a></td>
                    <td style={{ color: dep.status === "Pending" || dep.status === "pending" ? "orange" : dep.status === "Rejected" ? "red" : "lightgreen" }}>{dep.status}</td>
                    <td>
                      {(dep.status === "Pending" || dep.status === "pending") && (
                        <button onClick={() => approveDeposit(dep.id)}>Manual Credit Override</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ marginTop: "50px" }}>Client OTC Orders ({orders.length})</h3>
          <table border="1" style={{ width: "95%", margin: "20px auto", borderCollapse: "collapse", borderColor: "#334155" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b" }}>
                <th style={{ padding: "10px" }}>Order ID</th>
                <th>Wallet Address</th>
                <th>Asset Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "10px" }}>No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ padding: "10px" }}>{order.order_id}</td>
                    <td style={{ fontSize: "12px" }}>{order.wallet_address}</td>
                    <td>{order.coin}</td>
                    <td>{order.amount}</td>
                    <td style={{ color: order.status === "Pending" ? "orange" : order.status === "Rejected" ? "red" : "lightgreen" }}>
                      {order.status}
                    </td>
                    <td>
                      <button onClick={() => approveOrder(order)}>Approve</button>
                      <button onClick={() => rejectOrder(order.id)} style={{ marginLeft: "10px" }}>Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MY OTC ORDERS PAGE */}
      {page === "history" && (
        <div style={{ marginTop: "40px" }}>
          <h2>My OTC Orders</h2>
          <table border="1" style={{ width: "90%", margin: "20px auto", borderCollapse: "collapse", borderColor: "#334155" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b" }}>
                <th style={{ padding: "10px" }}>Order ID</th>
                <th>Coin</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(order => order.wallet_address?.toLowerCase() === walletAddress?.toLowerCase()).length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "10px" }}>You have no orders associated with this wallet address.</td>
                </tr>
              ) : (
                orders
                  .filter(order => order.wallet_address?.toLowerCase() === walletAddress?.toLowerCase())
                  .map(order => (
                    <tr key={order.id}>
                      <td style={{ padding: "10px" }}>{order.order_id}</td>
                      <td>{order.coin}</td>
                      <td>{order.amount}</td>
                      <td style={{ color: order.status === "Pending" ? "orange" : order.status === "Rejected" ? "red" : "lightgreen" }}>
                        {order.status}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;