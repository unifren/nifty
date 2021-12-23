import { useState, useEffect } from "react";
import axios from "axios";
import { ethers } from "ethers";
import ERC721 from "./ERC721";
import "./App.css";

const ipfs = "https://cloudflare-ipfs.com/ipfs/";

function App() {
  const [state, setState] = useState({ address: "", nfts: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setUp = async () => {
      let validAddress = null;
      try {
        validAddress = ethers.utils.getAddress(state.address);
      } catch (e) {
        console.log("Address Error");
      }
      if (validAddress) {
        console.log("Valid Address");
        setLoading(true);
        let myNFTs = await getNFTInfo(state.address);
        setState({
          address: state.address,
          nfts: myNFTs,
        });
        setLoading(false);
      }
    };
    setUp();
  }, [state.address]);

  const setAddress = (event) => {
    setState({
      address: event.target.value,
      nfts: [],
    });
  };

  const getNFTInfo = (address) => {
    return new Promise(async function (resolve, reject) {
      let myNFTs = await getChains(address);
      console.log(`Total ${myNFTs.length} NFTs`);
      for (var i in myNFTs) {
        console.log(`Fetching NFT #${i}`);
        let provider = new ethers.providers.JsonRpcProvider(
          myNFTs[i].chain.rpc
        );
        let nftContract = new ethers.Contract(
          myNFTs[i].contractAddress,
          ERC721.abi,
          provider
        );
        let tokenURI = null;
        tokenURI = await nftContract
          .tokenURI(myNFTs[i].tokenID)
          .catch((err) => {
            console.log("RPC Error");
            console.log(err);
          });
        if (tokenURI) {
          console.log(tokenURI);
          if (tokenURI.startsWith("ipfs://")) {
            tokenURI = ipfs + tokenURI.split("ipfs://")[1];
          }
        }

        let meta = { name: "Unknown", description: "N/A", image: null };
        let getMeta = false;
        if (tokenURI) {
          if (tokenURI.startsWith("data:application/json;base64,")) {
            tokenURI = JSON.parse(atob(tokenURI.substring(29)));
          } else {
            getMeta = true;
          }
        }
        if (getMeta) {
          let response = await axios
            .get(tokenURI, {
              // headers: {
              //   "Access-Control-Allow-Origin": "*",
              //   "Access-Control-Allow-Methods":
              //     "GET,PUT,POST,DELETE,PATCH,OPTIONS",
              // },
            })
            .catch((err) => {
              console.log("Error");
              getMeta = false;
            });
          if (getMeta) {
            myNFTs[i].meta = response.data;
          }
        }
        if (myNFTs[i].meta?.image) {
          if (myNFTs[i].meta.image.startsWith("ipfs://")) {
            myNFTs[i].meta.image =
              ipfs + myNFTs[i].meta.image.split("ipfs://")[1];
          }
        }
      }
      resolve(myNFTs);
    });
  };

  const getChains = (address) => {
    return new Promise(async function (resolve, reject) {
      let ethereum = await getERC721txns(
        {
          api: "api.etherscan.io",
          rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        },
        address
      );
      let polygon = await getERC721txns(
        { api: "api.polygonscan.com", rpc: "https://polygon-rpc.com" },
        address
      );
      let arbitrum = await getERC721txns(
        { api: "api.arbiscan.io", rpc: "https://arb1.arbitrum.io/rpc" },
        address
      );
      let avax = await getERC721txns(
        {
          api: "api.snowtrace.io",
          rpc: "https://api.avax.network/ext/bc/C/rpc",
        },
        address
      );
      let fantom = await getERC721txns(
        { api: "api.ftmscan.com", rpc: "https://rpc.ftm.tools/" },
        address
      );
      let bsc = await getERC721txns(
        { api: "api.bscscan.com", rpc: "https://bsc-dataseed.binance.org" },
        address
      );

      console.log("Finished Checking Chains");
      //console.log(myNfts);
      resolve([
        ...ethereum,
        ...polygon,
        ...arbitrum,
        ...avax,
        ...fantom,
        ...bsc,
      ]);
    });
  };

  const getERC721txns = (chain, address) => {
    console.log(`Checking Chain ${chain.api}`);
    return new Promise(async function (resolve, reject) {
      let tokens = [];
      const apiUrl = `https://${chain.api}/api?module=account&action=tokennfttx&address=${address}&sort=asc`;
      // const apiUrl = `https://${chain}/api?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=999999999&sort=asc`

      let response = await axios.get(apiUrl);
      //console.log(response.data);
      if (Array.isArray(response.data.result)) {
        for (var i in response.data.result) {
          let tokenCheck = tokens.findIndex(
            ({ contractAddress, tokenID }) =>
              contractAddress === response.data.result[i].contractAddress &&
              tokenID === response.data.result[i].tokenID
          );
          if (tokenCheck < 0) {
            tokens.push({
              chain: chain,
              contractAddress: response.data.result[i].contractAddress,
              tokenID: response.data.result[i].tokenID,
              tokenName: response.data.result[i].tokenName,
              tokenSymbol: response.data.result[i].tokenSymbol,
              owned: response.data.result[i].to === address ? true : false,
              meta: null,
            });
          } else {
            // console.log(tokenCheck);
            tokens[tokenCheck].owned =
              response.data.result[i].to === address ? true : false;
          }
        }
        // console.log(tokens);
        console.log(`Found ${tokens.length} NFTs`);
        resolve(tokens);
      } else {
        console.log("Error");
        reject("Error");
      }
    });
  };

  const NFT = ({ nft }) => {
    console.log(nft.meta);
    return (
      <div className="bg-gray-800 border-2 border-gray-600 rounded-xl p-6">
        <div className="flex flex-col justify-center items-center">
          <div className="flex justify-center">
            <img
              className="w-3/4 sm:w-full"
              src={nft.meta ? nft.meta.image : "./static.jpg"}
              alt={nft.meta ? nft.meta.name : "Unknown"}
            />
          </div>
          <div className="w-full mt-6 flex flex-col items-start">
            <p className="text-xl text-cyan-300">
              {nft.meta ? nft.meta.name : "Unknown"}
            </p>
            <p className="text-sm text-white mt-2">
              {nft.meta ? nft.meta.description : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-screen min-h-screen bg-gray-900 flex flex-col pb-12">
      <h1 className="mt-4 text-4xl text-center text-cyan-300">NIFTY</h1>
      <h2 className="mt-4 text-lg text-center text-white">
        Multi Chain NFT Viewer
      </h2>
      <h2 className="mt-4 text-xs text-center text-cyan-300">
        Ethereum, Arbitrum, Polygon, Avalanche, Fantom, BSC (lol)
      </h2>
      <div className="mt-8 flex justify-center">
        <input
          value={state.address}
          onChange={setAddress}
          type="text"
          name="address"
          id="address"
          className="p-4 mx-4 bg-gray-900 text-white focus:border-0 focus:ring-offset-cyan-300 focus:ring-2 focus:ring-offset-4 focus:ring-cyan-300 focus:border-cyan-300 block w-full max-w-lg text-md border-2 border-white rounded-md"
          placeholder="ETH Address"
        />
      </div>
      {loading && (
        <div className="p-4 mx-4 mt-8 flex flex-col space-y-5 justify-center items-center text-center">
          <h1 className="text-xl text-cyan-300">Looks Rare</h1>
          <h2 className="text-sm text-white">
            This could take a while, ipfs & rpc slow
          </h2>
          <h2 className="text-xs text-white">Loading...</h2>
        </div>
      )}
      <div className="bg-gray-900 mt-8 mx-4 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.nfts.map((nft, indx) => (
            <NFT nft={nft} />
          ))}
        </div>
      </div>
      <div className="p-4 mx-4 mt-20 flex flex-col space-y-5 justify-center items-center text-center">
        <h2 className="text-sm text-white">
          Notes: Check the console for progress. If your NFT's aren't loading
          properly they're probably centralised ones blocking CORS or funky
          contracts :)
        </h2>
        <h2 className="text-sm text-white underline">
          <a href="https://github.com/unifren/nifty" target="_blank">
            Git Hub
          </a>
        </h2>
      </div>
    </div>
  );
}

export default App;
