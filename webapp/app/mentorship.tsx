import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Button, Card, Choice, Eyebrow, Heading, Page, SectionTitle, Tag, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";

const dayLabels = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const times = ["09:00", "11:00", "14:00", "16:00"];
export default function MentorshipScreen() {
  const router = useRouter(); const { data, update } = useAppData();
  const [day, setDay] = useState(""); const [time, setTime] = useState("");
  const submit = async () => {
    if (!day || !time) return;
    const date = new Date();
    const targetDay = dayLabels.indexOf(day) + 1;
    const delta = (targetDay - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    date.setHours(12, 0, 0, 0);
    await update({ mentorshipRequests: [...data.mentorshipRequests, { date: date.toISOString().slice(0, 10), time, status: "pendente", createdAt: new Date().toISOString() }] });
    router.back();
  };
  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page><Eyebrow>MENTORIA</Eyebrow><Heading>Converse sobre suas decisões.</Heading><Body>Escolha uma sugestão de horário para registrar um pedido. Não há integração com agenda externa nesta versão.</Body>
    <Card><Tag tone="attention">HORÁRIOS DEMONSTRATIVOS</Tag><SectionTitle title="Dia da semana de preferência" />{dayLabels.map((value) => <Choice key={value} label={value} selected={day === value} onPress={() => setDay(value)} />)}</Card>
    <Card><SectionTitle title="Horário de preferência" />{times.map((value) => <Choice key={value} label={value} selected={time === value} onPress={() => setTime(value)} />)}</Card>
    <Button title="Registrar pedido de horário" onPress={() => void submit()} disabled={!day || !time} />
    <Card><SectionTitle title="Seus pedidos" />{data.mentorshipRequests.length ? data.mentorshipRequests.map((request, i) => <View key={`${request.createdAt}-${i}`} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: palette.line }}><Text style={{ color: palette.ink }}>{request.date} · {request.time}</Text><Text style={{ color: palette.amber, fontSize: 12, marginTop: 3 }}>Pendente · não confirmado com mentor ou calendário</Text></View>) : <Body>Nenhum pedido registrado.</Body>}</Card>
    <Card><Body>O pacote completo prevê quatro encontros individuais e acompanhamento por três meses. A agenda real depende da integração com Cal.com ou Calendly.</Body></Card>
  </Page></ScrollView>;
}
