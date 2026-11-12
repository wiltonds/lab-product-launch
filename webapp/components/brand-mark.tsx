import { Image } from "react-native";

const brandIcon = require("../assets/images/icon.png");
export function BrandMark({ size = 42 }: { size?: number }) {
  return <Image source={brandIcon} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel="Marca do Lab do Meu Negócio" />;
}
