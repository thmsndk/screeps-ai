// by ags
// function * creepIDThread () {
//     const roles = {
//       miningCollector: '🚚',
//       miningWorker: '⛏️',
//       worker: '👷',
//       scout: '👁️'
//     }
//     while (true) {
//       for (const { room, pos: { x, y }, memory: { role } } of Object.values(Game.creeps)) {
//         const icon = roles[role] || ''
//         if (icon) {
//           room.visual.text(icon, x, y + 0.1, { size: 0.4 })
//         }
//         yield true
//       }
//       yield
//     }
//   }
