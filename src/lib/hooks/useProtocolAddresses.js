import { useMemo } from "react";
import { resolveProtocolAddresses } from "../protocolAddresses";
import usePoolsConfig from "./usePoolsConfig";

function useProtocolAddresses() {
  const poolsConfig = usePoolsConfig();
  return useMemo(() => resolveProtocolAddresses(poolsConfig), [poolsConfig]);
}

export default useProtocolAddresses;
