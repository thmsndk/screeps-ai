# Infrastructure missions

An infrastructure mission contains a plan. A plan consists of room positions and the expected `structureType`, it also contains the `id` of the [constructionSite](https://docs.screeps.com/api/#ConstructionSite) or the [finished structure](https://docs.screeps.com/api/#Structure).

An infrastructure mission has creeps assigned that can utilize the [build](https://docs.screeps.com/api/#Creep.build) method.
> Requires `WORK` and `CARRY` body parts. The target has to be within 3 squares range of the creep.

An infrastructure mission is responsible for calling [createConstructionSite](https://docs.screeps.com/api/#Room.createConstructionSite) in case there is not a construction site present and the site has not finished. e.g. it was stomped.

- How do we check if there is a plan for a specific position
- What if another plan also has something marked on a specific position
  - What if the `roomObjects` can not exist in the same space?

It should be possible to mark multiple layers in a mission.
We might build a road on an earlier mission, but add a rampart in a later mission

It should be possible to `delay` parts of an infrastructure mission code untill a certain tick has been reached

It should be possible to toggle visualization of the mission

> Should we queue multiple construction sites to workers so they start moving towards their next target?

## Ad-hoc infrastructure mission
When a player manually places construction sites, theese are validated against planned infrastructure.
- Should override plan if placed construction site is not equal
- if no plan is found, it should be added to the ad-hoc plan
  - What if the planner is not done running, what should happen with ad-hoc construction sites then?

## RCL dependant infrastructure mission
Infrastructure is different based on each RCL lvl or energyCapacity.
It should be possible to attach "extensions" onto an infrastructure mission

# Memory
Infrastructure persists memory to the village (room)
Might need to extract out Infrastructure to a global object we can query about infrastructure, e.g. a roomplan
should ba an infrastructure dictionary with a room giving back the "plan"
```yuml
// {type:class}
// {direction:leftToRight}
// {generate:true}

//[note: You can stick notes on diagrams too!{bg:cornsilk}]
[Infrastructure|layers|startTick?|finishTick?]
[Layer|roomName|positions|enabled|startTick?|finishTick?]
[InfrastructurePosition|structureType|x|y|id?|startTick?|finishTick?]

[Infrastructure]1-*>[Layer]

[Layer]1-*>[InfrastructurePosition]
```


