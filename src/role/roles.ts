export type RoleConstant = LARVAE | HARVESTER | BUILDER | UPGRADER

type LARVAE = "Larvae";
type HARVESTER = "harvester";
type BUILDER = "builder";
type UPGRADER = "upgrader";

export const Role = {
    harvester: 'harvester' as HARVESTER,
    upgrader: 'upgrader' as UPGRADER,
    builder: 'builder' as BUILDER,
    Larvae: 'Larvae' as LARVAE,
}

