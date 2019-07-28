# Terminology

## Yggdrasil
> The center of the Vikings’ cosmos is the ash tree Yggdrasil, growing out of the Well of Urd. Yggdrasil  holds the Nine Worlds, home of gods, man and all spiritual beings.

The name of our initial spawn

## Village
  - Has a spawn
  - Can have outposts (_should they be called that?_) (remotes?)

## Counsil
Responsible for missions in village and outposts
- Should generate missions
- Should allocate creeps to missions
  - finds an idle creep that can solve the task
  - if no creep is found, should request a creep from Freya

### Missions
Should we call them missions?

#### Village missions
  - [Energy](./EnergyMission.md)
  - Mineral
  - [Infrastructure](./InfrastructureMission.md)
    - RCL 1..8
  - Defense (DEFCON?)
    - invaders
    - players

#### Outpost missions/raids
  - Remote Energy
  - Remote Mineral
  - Remote Infrastructure
    - Containers
    - Road
    - ...

## Freya
> feather-cloaked goddess of love and fertility but also of war and death

Responsible for spawning creeps

```yuml
// {type:usecase}
// {direction:topDown}
//// {generate:true}

// [Creep]
// [Creep]^[Villager]
// [Creep]^[Viking]

(note: responsible of making missions)-[Council]
[Council]-(Ad-hoc construction sites mission)
[Council]-(Allocate creeps to mission)
(Allocate creeps to mission)-(Find idle creeps with adequate power)
//(Find idle creeps with correct power)-[Creep]
(Allocate creeps to mission)-(request creep with adequate power)

(note: the empire)-[Yggdrasil]
[Yggdrasil]-(Process each village)

(note: Responsible for spawning creeps)-[Freya]
[Freya]-(Give birth to largest creep possible)
[Freya]-(Give birth to exact creep request)

```



https://www.historyonthenet.com/vikings-and-norse-mythology

# Yggdrasil and the Nine Worlds
> The center of the Vikings’ cosmos is the ash tree Yggdrasil, growing out of the Well of Urd. Yggdrasil  holds the Nine Worlds, home of gods, man and all spiritual beings. The gods live in Asgard and Vanaheim  and humans inhabit Midgard. Giants live in Jotunheim, elves in Alfheim and dwarves in Svartalfheim.  Another is the primordial world of ice, Niflheim, while Muspelheim is the world of fire. The last world  comprises Hel, the land of the dead, ruled by the goddess Hel.

> Gods and Goddesses
> The gods and goddesses venerated by the Vikings are Odin, Thor, Loki, Baldur, Frigg, Freya, Freyr and  Njoror. There are many other gods and goddesses in the Norse pantheon but these received the primary  attention in the sagas and eddas.

> Odin, the allfather, the one-eyed seeker of wisdom, god of magic, war and runes, hung himself on > Yggdrasil for nine days and nights to find wisdom, brought the runes to mankind
> Thor, with his magic hammer Mjolnir, protects mankind and his realm of Midgard, god of warriors
> Loki, a dangerous half-god, half-giant trickster always wreaking havoc among the gods
> Baldur, son of Odin and Frigg, a beautiful and gracious god, beloved of all, killed by Loki’s trickery
> Frigg, wife of Odin, practitioner of magic, goddess of the home, mother of Baldur
> Freya, feather-cloaked goddess of love and fertility but also of war and death
> Freyr, her brother, god of farming, agriculture, fertility and prosperity
> Njoror, powerful god of the sea


http://www.hurstwic.org/history/articles/society/text/social_classes.htm

https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/power-and-aristocracy/social-order-in-the-viking-age/

