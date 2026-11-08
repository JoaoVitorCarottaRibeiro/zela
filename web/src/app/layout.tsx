import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Uma única fonte em todo o site.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-inter",
});

export const metadata: Metadata = {
  title: "Zela — cuidado em saúde que começa em você",
  description:
    "A Zela faz a triagem dos seus sintomas por texto, voz ou foto e orienta o próximo passo certo: cuidar em casa, procurar a UBS ou chamar o socorro. A IA orienta e prioriza — não substitui o atendimento médico.",
  icons: { icon: "/brand/zela-simbolo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
