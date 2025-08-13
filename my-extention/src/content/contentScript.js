// // This will run inside the web page
// window.addEventListener("message", async (event) => {
//   if (event.source !== window) return;

//   if (event.data.type === "CONNECT_WALLET") {
//     if (typeof window.ethereum !== "undefined") {
//       try {
//         const accounts = await window.ethereum.request({
//           method: "eth_requestAccounts"
//         });
//         window.postMessage({
//           type: "WALLET_CONNECTED",
//           accounts
//         }, "*");
//       } catch (err) {
//         console.error("MetaMask error:", err);
//       }
//     } else {
//       alert("MetaMask not found!");
//     }
//   }
// });

console.log("Content script loaded!");

document.body.style.border = "5px solid red";
