// By ags
// Modified by thmsn
import { Role } from "role/roles"

interface RoleIcons {
  [key: string]: string
}

export function visualizeCreepRole() {
  // tslint:disable-next-line: one-variable-per-declaration
  const roles: RoleIcons = {
    [Role.Larvae]: "🚚",
    [Role.harvester]: "⛏️",
    [Role.builder]: "👷",
    [Role.upgrader]: "⚡"
    //   scout: '👁️'
  }

  for (const {
    room,
    pos: { x, y },
    memory: { role }
  } of Object.values(Game.creeps)) {
    const icon = role ? roles[role] : ""
    if (icon) {
      room.visual.text(icon, x, y + 0.1, { font: 0.4 })
    }
  }
}
