// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SnapshotReceipt is ERC721, Ownable {
  struct Meta { string merkleRoot; string attestationTx; uint256 createdAt; }
  mapping(uint256 => Meta) public meta;
  uint256 public nextId;

  constructor() ERC721("SnapshotReceipt","SNAP") {}

  function mintReceipt(address to, string memory merkleRoot, string memory attTxn) external onlyOwner returns (uint256) {
    nextId++;
    _safeMint(to, nextId);
    meta[nextId] = Meta(merkleRoot, attTxn, block.timestamp);
    return nextId;
  }

  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    // return basic JSON metadata (could be improved to use IPFS)
    Meta memory m = meta[tokenId];
    return string(abi.encodePacked(
      'data:application/json,{"name":"Snapshot #', toString(tokenId),
      '","description":"Attested snapshot","merkleRoot":"', m.merkleRoot,
      '","attestationTx":"', m.attestationTx,
      '","createdAt":"', toString(m.createdAt), '"}'
    ));
  }

  function toString(uint256 value) internal pure returns (string memory) {
      // from OpenZeppelin Strings.toString - simplified
      if (value == 0) return "0";
      uint256 temp = value;
      uint256 digits;
      while (temp != 0) { digits++; temp /= 10; }
      bytes memory buffer = new bytes(digits);
      while (value != 0) { digits -= 1; buffer[digits] = bytes1(uint8(48 + uint256(value % 10))); value /= 10; }
      return string(buffer);
  }
}
