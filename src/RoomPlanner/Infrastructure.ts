import { Dictionary } from "lodash"

import { InfrastructureLayer } from "./InfrastructureLayer"
import { InfraStructureLayerMemory } from "./InfraStructureLayerMemory"
import { InfrastructureMemory } from "./InfrastructureMemory"
import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
import { log } from "_lib/Overmind/console/log"
import { deref, derefRoomPosition } from "task/utilities/utilities"

// https://en.wikipedia.org/wiki/Yggdrasil
const spawnNames = [
  "Yggdrasil",
  "Urðarbrunnr", // Root
  "Hvergelmir", // Root
  "Mímisbrunnr", // Root
  // Nine worlds
  "Ásgarðr",
  "Vanaheimr",
  "Álfheimr",
  "Miðgarðr",
  "Jötunheimr",
  "Múspellsheimr",
  "Svartálfaheimr",
  "Niflheimr",
  "Niðavellir"
]

interface InfraStructureConstructor {
  memory?: InfrastructureMemory
}

export class Infrastructure {
  public Layers: { [roomName: string]: InfrastructureLayer[] }

  private memory: InfrastructureMemory // TODO: should it be a property that fetches memory from the memory object?

  public constructor(parameters?: InfraStructureConstructor) {
    this.hydrate()

    const layers = {} as { [roomName: string]: InfrastructureLayer[] }

    if (!Memory.infrastructure) {
      Memory.infrastructure = { layers: {} }
    }

    this.memory = Memory.infrastructure
    if (parameters?.memory?.layers) {
      for (const roomName in parameters.memory.layers) {
        if (parameters.memory.layers.hasOwnProperty(roomName)) {
          const roomLayers = parameters.memory.layers[roomName]
          if (!layers[roomName]) {
            layers[roomName] = [] as InfrastructureLayer[]
          }
          if (roomLayers) {
            roomLayers.forEach(layer => {
              layers[layer.roomName].push(new InfrastructureLayer(layer.roomName, layer))
            })
          }
        }
      }
    }

    // Parse existing memory
    if (this.memory?.layers) {
      // // this.memory.layers.forEach(layer => {
      // //   layers.push(new InfrastructureLayer(layer.roomName, layer))
      // // })
      for (const roomName in this.memory.layers) {
        if (this.memory.layers.hasOwnProperty(roomName)) {
          const roomLayers = this.memory.layers[roomName]
          if (!layers[roomName]) {
            layers[roomName] = [] as InfrastructureLayer[]
          }
          roomLayers.forEach(layer => {
            layers[layer.roomName].push(new InfrastructureLayer(layer.roomName, layer))
          })
        }
      }
    }

    this.Layers = layers
  }

  public hydrate(): void {
    if (Memory.infrastructure) {
      this.memory = Memory.infrastructure
    }

    if (Game.time % 10 === 0) {
      for (const roomName in this.Layers) {
        if (this.Layers.hasOwnProperty(roomName)) {
          const roomLayers = this.Layers[roomName]
          roomLayers.forEach((layer, index) => {
            layer.Positions.forEach(position => {
              if (position.id) {
                const roomObject = deref(position.id)
                if (!roomObject) {
                  log.warning(
                    `${derefRoomPosition({ ...position.pos, roomName }).print} was destroyed/removed, clearing`
                  )
                  position.destroyed()
                }
              }
            })
          })
        }
      }
    }
  }

  public AddLayer(roomName: string, memory?: InfraStructureLayerMemory): void {
    if (this.memory) {
      if (!memory) {
        memory = { roomName, positions: [] as InfraStructurePositionMemory[] }
      }

      if (!this.memory.layers[roomName]) {
        this.memory.layers[roomName] = []
      }

      this.memory.layers[roomName].push(memory)
    }

    if (!this.Layers[roomName]) {
      this.Layers[roomName] = []
    }

    this.Layers[roomName].push(new InfrastructureLayer(roomName, memory as InfraStructureLayerMemory))
  }

  public AddPosition(
    roomName: string,
    layerIndex: number,
    structureType: BuildableStructureConstant,
    x: number,
    y: number
  ): void {
    this.Layers[roomName][layerIndex].AddPosition(structureType, x, y)
  }

  public addConstructionSite(layerIndex: number, constructionSite: ConstructionSite<BuildableStructureConstant>): void {
    this.Layers[constructionSite.pos.roomName][layerIndex].addConstructionSite(constructionSite)
  }

  // // // TODO: merge findInfrastructure with some sort of overload
  // // public findBuildableInfrastructure(
  // //   structureType: BuildableStructureConstant
  // // ): Dictionary<FindInfrastructureResult[]> {
  // //   const results = {} as Dictionary<FindInfrastructureResult[]>
  // //   this.Layers.forEach((layer, index) => {
  // //     const positions = layer.Positions.filter(p => p.StructureType === structureType)
  // //     if (positions && positions.length > 0) {
  // //       if (!results[index]) {
  // //         results[index] = []
  // //       }

  // //       positions.forEach(position => {
  // //         results[index].push({ roomName: layer.roomName, pos: position.pos })
  // //       })
  // //     }
  // //   })

  // //   return results
  // // }

  public findInfrastructure(constructionSite: ConstructionSite): Dictionary<FindInfrastructureResult> {
    const results = {} as Dictionary<FindInfrastructureResult>
    this.Layers[constructionSite.pos.roomName].forEach((layer, index) => {
      const position = layer.Positions.find(p => p.id === constructionSite.id)
      if (position) {
        results[index] = { roomName: layer.roomName, pos: position.pos }
      }
    })

    return results
  }

  public getSpawnName(): string | undefined {
    const existingSpawnNames = Object.keys(Game.spawns)
    const availableNames = [...spawnNames.filter(name => !existingSpawnNames.includes(name))]
    // TODO: potential issues if we have multiple spawn cSites, we don't know what name is used unless we cache it.
    const spawnConstructionSites = Object.values(Game.constructionSites).filter(
      site => site.structureType === STRUCTURE_SPAWN
    )

    const spawnName = availableNames.slice(spawnConstructionSites.length - 1, spawnConstructionSites.length)

    // eslint-disable-next-line id-blacklist
    return spawnName.length === 1 ? spawnName[0] : undefined
  }

  public visualize(): void {
    // Should probably limit to room?

    for (const roomName in this.Layers) {
      if (this.Layers.hasOwnProperty(roomName)) {
        const roomLayers = this.Layers[roomName]
        const room = Game.rooms[roomName]

        let extensionCount = 0
        roomLayers.forEach((layer, index) => {
          if (room) {
            layer.Positions.forEach(position => {
              if (position.StructureType === STRUCTURE_EXTENSION) {
                extensionCount++
              }
              // Console.log("=== Extension " + extensionCount)
              // Console.log(JSON.stringify(position))
              if (!position.finished) {
                room.visual.structure(position.pos.x, position.pos.y, position.StructureType, { opacity: 0.25 })
                // TODO: color by RCL level
                if (position.StructureType === STRUCTURE_EXTENSION) {
                  room.visual.text(extensionCount.toString(), position.pos.x, position.pos.y + 0.25, { opacity: 0.25 })
                }
              }
            })
          }
        })
      }
    }
  }
}

interface FindInfrastructureResult {
  roomName: string
  pos: { x: number; y: number }
}
