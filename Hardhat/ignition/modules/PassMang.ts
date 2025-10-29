import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PassMangModule", (m) => {
  const PassMang = m.contract("PassMang");

  return { PassMang };
});
