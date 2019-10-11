# Energy Mission
An energy mission is a mission to obtain energy from a room. It has knowledge of how many sources it can mine from, how much energy is in them.

The goal of a energy mission is to keep atleast 1 harvester on each node as long as it is safe.

e.g. if we have two harvesters on 1 node and one of the harvesters can move to the other source faster to harvest, it should do that. if the node is empty and the other node is not empty, it should move aswell.

An energy mission has creeps assigned that can utilize the following methods
* [harvest](https://docs.screeps.com/api/#Creep.harvest)
* [move](https://docs.screeps.com/api/#Creep.move)
* [pickup](https://docs.screeps.com/api/#Creep.pickup)
* [transfer](https://docs.screeps.com/api/#Creep.transfer)
* [withdraw](https://docs.screeps.com/api/#Creep.withdraw)
> Requires `MOVE`, `WORK` and `CARRY` body parts.

An energy mission should have a "goal"? e.g. what is the goal of an energy mission in a "remote room"? filling a container in the room to upgrade the controller?, filling a container to let a hauler, haul it back to the home room? or somewhere else?


> We have multiple tiers of energy missions, not sure what triggers each tier. amount of extensions or available energy could be one marker


## Tier 0
Cheapest harvesters are created, this is the bootstrap phase. they can peform all actions and are responsible for the following.
* harvest a source
* transfer harvested energy to `spawn`, `extension`, `container`, `storage`
    * should not target the same delivery unless it has room for it's payload
* construct a container? -> Tier 1

harvester [body](https://screeps.arcath.net/creep-designer/?share=1#1#0#0#0#0#0#1) `CARRY`, `WORK`, `MOVE` this body requires `1500 ticks` 2/T to harvest the source costs 200 and can be done in RCL 1

[body 2](https://screeps.arcath.net/creep-designer/?share=1#2#0#0#0#0#0#1)
`MOVE, WORK, WORK, CARRY` requires 750 ticks at 4/T to drain the source costs 300 and can be done in RCL 1 then we need two harvesters, so we need to keep harvest positions in mind

A container costs `5000 energy` body2 can build it in 500 ticks at 10/T
Tier 1 body can build it in 200 ticks at 25/T it requires 600 energy for that body so we require at least 6 extensions to be able to build that body and requires RCL 3

## Tier 1
`harvesters` and `haulers` are spawned, we want 1 harvester and 1 hauler at minimum per source. it is important to have atleast 1 harvester on each source to trigger the regen as fast as possible. The current harvester body setup will require `300 ticks` to harvest, and then it should regen, so they should  probably never move or anything, aka `static harvesters`

### harvester
Their goal is to `harvest` for as much of their lifetime as possible.
A harvester has the following [body](https://screeps.arcath.net/creep-designer/?share=1#5#0#0#0#0#0#1) costs 600 RCL 3
* 1 x `CARRY`
* 5 x `WORK`
* 1 x `MOVE`

### hauler
Priortied Goals
1) Pick up dropped energy near source
2) withdraw energy from source containers if the container is more than 50% full
    - a hauler should consider all containers
    - haulers should not target the same container
3) haul energy to `extension`, `spawn`, `storage`

A hauler has the following [body](https://screeps.arcath.net/creep-designer/?share=3#0#0#0#0#0#0#3)
* 3 x `CARRY`
* 3 x `MOVE`

# Memory
