# Mechanics and build-guide audit

Source: https://osugacha.com/assets/rpg-Rm3zoMWw.js
Homepage checked: 2026-10-31 (Asia/Shanghai); current asset is rpg-Rm3zoMWw.js.
SHA-256 (UTF-8 source): 0f7c0ff382b7c9f314bf04c15ce657f2f85290ae533cb31ed34c99c52757b9bb

## 2026-10-31 revision comparison

- Compared rpg-Dm4muRFI.js with rpg-Rm3zoMWw.js. Both are 128666 UTF-16 code units / 128760 UTF-8 bytes.
- The only changed range is UTF-16 offset [131, 138): the import asset identifier changed from overlays-B7A9WJav.js to overlays-NbLz_OEv.js.
- The complete RPG body after the import statement is byte-for-byte unchanged; no skill, passive, MOD, combination, battle-state or build-recipe mechanics changed.
- Previous source SHA-256: c3b0ba8c64e1ea154668471d024a3ae5cc71c0bd2e52a0655243ad6351768f7f.
- All 12 recipes remain valid as rule-derived examples; the data date, source URL and audit hash were refreshed, not the editorial recommendations.

Offsets below are zero-based JavaScript string UTF-16 code-unit offsets, not line numbers or byte offsets.

| Claim / code area | Offset | Exact marker |
| --- | ---: | --- |
| MOD combination matching | 29212 | "function ot(e){let t=new Set(e)" |
| Single MOD effects retained (alternate signature) | 36006 | "function Ft(e){" |
| MOD star scaling | 22337 | "et={1:.4,2:.55,3:.7,4:.85,5:1}" |
| MOD enhancement limits | 21162 | "H={1:3,2:6,3:9,4:12,5:15}" |
| Per-type effects | 22544 | "function nt(e,t,n,r)" |
| Skill/passive exclusive synergies | 12008 | "he={bulwark:" |
| Full team shape rules | 38711 | "Yt=[" |
| Team shape implementation | 40683 | "function en(e)" |
| Team stat cap implementation | 43077 | "function nn(e,t)" |
| Floor MOD rules | 43646 | "cn={hr:" |
| Status dictionary | 74156 | "li={expose:" |
| Initial shared SP | 77569 | "te=r===`blank`?0:3" |
| SP clamping | 79653 | "function Te(e,t)" |
| Same-status merging | 79755 | "function R(e,t,n,r,i)" |
| Debuff application and Contagion | 80111 | "function Ee(e,t,n,i,a,o=2)" |
| Push cap | 80520 | "function De(e,t)" |
| Heal and Sustain shield cap | 82472 | "function B(e,t,n)" |
| General shield cap | 83010 | "function V(e,t,r,i=!1)" |
| Break effects | 83343 | "function Ie(e,t)" |
| SD disables Second Chance | 82212 | "function Fe(e){if(n===`sd`)" |
| Mend-specific shield cap | 94297 | "case`mend`:{let n=t" |
| Action resolution and SP spending | 96884 | "function Qe(e,n,i)" |
| Turn start and Guard recovery | 99158 | "function nt(){for(;!ie&&!_;)" |
| Current skill execution constants | 95434 | "function Ye(e,t,n,r){let i=e.ref.side" |
| AI scoring table is not skill execution | 100501 | "let W={\"shield-bash\":" |

## Recipe combination cross-check

| Guide | Selected MODs | Active combinations |
| --- | --- | --- |
| break-carry | so + fl + hr | shatter |
| piercing-crit | hd + hr + pf | crit, ss |
| execute-chain | sd + pf + fl | executioner |
| storm-sustain | so + nc + ez | storm |
| momentum-engine | so + rx + nf | juggernaut, opening |
| iron-reflect | nf + ht + so | fortress, juggernaut |
| team-shields | ez + nf + ht | defensive |
| mend-lifeline | ez + ht + dt | sustain |
| sanctuary-safety | ez + nf + rx | secondchance |
| hymn-conductor | rx + nc + dt | conductor |
| curse-spread | hd + ht + nc | contagion |
| stall-first | hd + ht + fl | pindown |

## Evidence boundaries

- Guides are editorial deductions from publicly served rules, not official recommendations or measured win rates.
- No private inventory, login cookie, trading, pulls or battle action API was used.
- The client contains an AI scoring table named W with some approximate/different skill weights. Those values were NOT used as actual skill multipliers; the actual Ye execution uses the shared y constants.
- Recipe MOD matching was cross-checked against all 28 definitions. Three-item combinations suppress contained two-item combinations, but do not erase item stats or single-type effects.
- The 50% shield limit is a generic total-cap path; Sustain and Mend enforce separate lower remaining-cap checks. Do not add their 10% and 25% limits to advertise 35%.
- Floor SD and equipment SD are different effects. Client Fe also rejects Second Chance on floor SD, even though the short floor label only lists shields, Guardian Angel and Undying.
- Client rules are a snapshot, not proof that every server-side battle behavior or later update is identical.
