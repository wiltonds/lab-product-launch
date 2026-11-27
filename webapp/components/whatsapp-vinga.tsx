import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppData } from "@/hooks/use-app-data";
import { registrarEvento } from "@/shared/leads";
import { linkWhatsappVinga } from "@/shared/whatsapp";

/**
 * "Receber meu plano no WhatsApp": abre o WhatsApp da pessoa numa conversa com o Vinga, com a mensagem pronta.
 * A pessoa manda a primeira mensagem; a saudação automática do WhatsApp Business responde na hora (grátis, sem API).
 */
export function WhatsAppVinga({ escuro = false }: { escuro?: boolean }) {
  const { data } = useAppData();
  const abrir = () => {
    void registrarEvento("chamou_whatsapp", { atividade: data.idea.activity, municipioCodigo: data.idea.municipalityCode });
    void Linking.openURL(linkWhatsappVinga(data.idea.activity, data.idea.municipality));
  };
  return <Pressable accessibilityRole="link" onPress={abrir} style={({ pressed }) => ({
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14,
    backgroundColor: escuro ? "rgba(255,255,255,0.10)" : "#E7F8EE", opacity: pressed ? 0.85 : 1,
  })}>
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#25D366", alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: escuro ? "#FFFFFF" : "#0B5132", fontWeight: "800", fontSize: 15 }}>Receber meu plano no WhatsApp</Text>
      <Text style={{ color: escuro ? "#CFD9EA" : "#2F6B4F", fontSize: 13 }}>Fale com o Vinga e tire dúvidas sobre os seus números</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={escuro ? "#CFD9EA" : "#2F6B4F"} />
  </Pressable>;
}
