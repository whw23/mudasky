"use client"

import { useTranslations } from "next-intl"
import { GraduationCap, Globe, Handshake } from "lucide-react"

/** 关于页团队介绍 */
export function TeamSection() {
  const t = useTranslations("About")

  const team = [
    { icon: GraduationCap, name: t("team.leader"), role: t("team.leaderRole"), desc: t("team.leaderDesc") },
    { icon: Globe, name: t("team.consultant"), role: t("team.consultantRole"), desc: t("team.consultantDesc") },
    { icon: Handshake, name: t("team.visa"), role: t("team.visaRole"), desc: t("team.visaDesc") },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Our Team</h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("teamTitle")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {team.map((member) => (
          <div key={member.name} className="group rounded-lg border p-6 text-center transition-all hover:shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-primary/10">
              <member.icon className="h-8 w-8 text-gray-400 transition-colors group-hover:text-primary" />
            </div>
            <h4 className="mt-4 text-lg font-bold">{member.name}</h4>
            <p className="text-sm text-primary">{member.role}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
