import { Redirect } from "expo-router";

/** O simulador antigo virou o painel do plano: uma conta só no app. A aba continua existindo e leva para lá. */
export default function SimulatorScreen() {
  return <Redirect href="/plano" />;
}
