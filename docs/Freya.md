# Freya
> feather-cloaked goddess of love and fertility but also of war and death

Should be able to request a specific creep from Freya, e.g.
* `1M 1W 1C`
* `1M 5W 1C`
* ...

This is what we call a "score" combined of movescore, workscore, carry score a bodypart score if you will

A request should have a priority, so we can prioritize all requests. It should also have a target / parent / sender so you know who requested it or what it was requested for. We also need it to determine what spawner we should utilize.
> Can we wait x ticks for it to be spawned? from a closer spawn?, if the wait time is the same as the travel time, it should not matter.

A creep is born without a role
A creep can handle multiple roles based on their body part score
A creep has engraved runes of what roles they can handle and how well they handle them. `memory.runes`
