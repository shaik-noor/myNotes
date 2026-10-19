// Nature
import alpineCamp from '../../../assets/banners/alpine-camp.jpg'
import architectureLines from '../../../assets/banners/architecture-lines.jpg'
import autumnRoad from '../../../assets/banners/autumn-road.jpg'
// Construction
import bridgeCables from '../../../assets/banners/bridge-cables.jpg'
import brutalistForms from '../../../assets/banners/brutalist-forms.jpg'
import canyonLight from '../../../assets/banners/canyon-light.jpg'
// Technology & Devices
import circuitMacro from '../../../assets/banners/circuit-macro.jpg'
import citySkyline from '../../../assets/banners/city-skyline.jpg'
import coastalStorm from '../../../assets/banners/coastal-storm.jpg'
// Architecture
import concreteAtrium from '../../../assets/banners/concrete-atrium.jpg'
import concreteWall from '../../../assets/banners/concrete-wall.jpg'
import cpuChip from '../../../assets/banners/cpu-chip.jpg'
import craneSkyline from '../../../assets/banners/crane-skyline.jpg'
import dataCenter from '../../../assets/banners/data-center.jpg'
import desertDunes from '../../../assets/banners/desert-dunes.jpg'
import excavationSite from '../../../assets/banners/excavation-site.jpg'
import fiberOptics from '../../../assets/banners/fiber-optics.jpg'
import foggyMountains from '../../../assets/banners/foggy-mountains.jpg'
import forestFalls from '../../../assets/banners/forest-falls.jpg'
import glassFacade from '../../../assets/banners/glass-facade.jpg'
import goldenGate from '../../../assets/banners/golden-gate.jpg'
import goldenMeadow from '../../../assets/banners/golden-meadow.jpg'
import greenHills from '../../../assets/banners/green-hills.jpg'
import highlandRoad from '../../../assets/banners/highland-road.jpg'
import keyboardMacro from '../../../assets/banners/keyboard-macro.jpg'
import lakeReflection from '../../../assets/banners/lake-reflection.jpg'
// Textures
import marbleVein from '../../../assets/banners/marble-vein.jpg'
import minimalDesk from '../../../assets/banners/minimal-desk.jpg'
import mistyForest from '../../../assets/banners/misty-forest.jpg'
import modernBuilding from '../../../assets/banners/modern-building.jpg'
import motherboard from '../../../assets/banners/motherboard.jpg'
import mountainMist from '../../../assets/banners/mountain-mist.jpg'
import northernLights from '../../../assets/banners/northern-lights.jpg'
import oceanWaves from '../../../assets/banners/ocean-waves.jpg'
import palmLeaves from '../../../assets/banners/palm-leaves.jpg'
import riverCanyon from '../../../assets/banners/river-canyon.jpg'
import rustedMetal from '../../../assets/banners/rusted-metal.jpg'
import sandRipples from '../../../assets/banners/sand-ripples.jpg'
import scaffoldTower from '../../../assets/banners/scaffold-tower.jpg'
import serverRacks from '../../../assets/banners/server-racks.jpg'
import slateStone from '../../../assets/banners/slate-stone.jpg'
import snowyPeaks from '../../../assets/banners/snowy-peaks.jpg'
import spiralStairs from '../../../assets/banners/spiral-stairs.jpg'
import starryNight from '../../../assets/banners/starry-night.jpg'
import steelFramework from '../../../assets/banners/steel-framework.jpg'
import tunnelRebar from '../../../assets/banners/tunnel-rebar.jpg'
import valleyCliffs from '../../../assets/banners/valley-cliffs.jpg'
import weatheredWood from '../../../assets/banners/weathered-wood.jpg'
import workspaceLaptop from '../../../assets/banners/workspace-laptop.jpg'
import workstationSetup from '../../../assets/banners/workstation-setup.jpg'

export type BannerCategory =
  | 'Nature'
  | 'Architecture'
  | 'Construction'
  | 'Technology'
  | 'Textures'
  | 'Workspace'

export const BANNER_CATEGORIES: BannerCategory[] = [
  'Nature',
  'Architecture',
  'Construction',
  'Technology',
  'Textures',
  'Workspace'
]

export interface BannerImage {
  id: string
  name: string
  url: string
  category: BannerCategory
}

export const BANNER_IMAGES: BannerImage[] = [
  // Nature
  { id: 'mountain-mist', name: 'Mountain Mist', url: mountainMist, category: 'Nature' },
  { id: 'misty-forest', name: 'Misty Forest', url: mistyForest, category: 'Nature' },
  { id: 'foggy-mountains', name: 'Foggy Mountains', url: foggyMountains, category: 'Nature' },
  { id: 'snowy-peaks', name: 'Snowy Peaks', url: snowyPeaks, category: 'Nature' },
  { id: 'alpine-camp', name: 'Alpine Camp', url: alpineCamp, category: 'Nature' },
  { id: 'green-hills', name: 'Green Hills', url: greenHills, category: 'Nature' },
  { id: 'highland-road', name: 'Highland Road', url: highlandRoad, category: 'Nature' },
  { id: 'golden-meadow', name: 'Golden Meadow', url: goldenMeadow, category: 'Nature' },
  { id: 'autumn-road', name: 'Autumn Road', url: autumnRoad, category: 'Nature' },
  { id: 'valley-cliffs', name: 'Valley Cliffs', url: valleyCliffs, category: 'Nature' },
  { id: 'lake-reflection', name: 'Lake Reflection', url: lakeReflection, category: 'Nature' },
  { id: 'river-canyon', name: 'River Canyon', url: riverCanyon, category: 'Nature' },
  { id: 'forest-falls', name: 'Forest Falls', url: forestFalls, category: 'Nature' },
  { id: 'ocean-waves', name: 'Ocean Waves', url: oceanWaves, category: 'Nature' },
  { id: 'coastal-storm', name: 'Coastal Storm', url: coastalStorm, category: 'Nature' },
  { id: 'desert-dunes', name: 'Desert Dunes', url: desertDunes, category: 'Nature' },
  { id: 'canyon-light', name: 'Canyon Light', url: canyonLight, category: 'Nature' },
  { id: 'palm-leaves', name: 'Palm Leaves', url: palmLeaves, category: 'Nature' },
  { id: 'starry-night', name: 'Starry Night', url: starryNight, category: 'Nature' },
  { id: 'northern-lights', name: 'Northern Lights', url: northernLights, category: 'Nature' },

  // Architecture
  { id: 'concrete-atrium', name: 'Concrete Atrium', url: concreteAtrium, category: 'Architecture' },
  { id: 'glass-facade', name: 'Glass Facade', url: glassFacade, category: 'Architecture' },
  { id: 'spiral-stairs', name: 'Spiral Stairs', url: spiralStairs, category: 'Architecture' },
  { id: 'brutalist-forms', name: 'Brutalist Forms', url: brutalistForms, category: 'Architecture' },
  {
    id: 'architecture-lines',
    name: 'Architecture Lines',
    url: architectureLines,
    category: 'Architecture'
  },
  { id: 'modern-building', name: 'Modern Building', url: modernBuilding, category: 'Architecture' },
  { id: 'city-skyline', name: 'City Skyline', url: citySkyline, category: 'Architecture' },
  { id: 'golden-gate', name: 'Golden Gate', url: goldenGate, category: 'Architecture' },

  // Construction
  { id: 'steel-framework', name: 'Steel Framework', url: steelFramework, category: 'Construction' },
  { id: 'crane-skyline', name: 'Crane Skyline', url: craneSkyline, category: 'Construction' },
  { id: 'tunnel-rebar', name: 'Tunnel Rebar', url: tunnelRebar, category: 'Construction' },
  { id: 'bridge-cables', name: 'Bridge Cables', url: bridgeCables, category: 'Construction' },
  { id: 'scaffold-tower', name: 'Scaffold Tower', url: scaffoldTower, category: 'Construction' },
  { id: 'excavation-site', name: 'Excavation Site', url: excavationSite, category: 'Construction' },

  // Technology
  { id: 'circuit-macro', name: 'Circuit Macro', url: circuitMacro, category: 'Technology' },
  { id: 'server-racks', name: 'Server Racks', url: serverRacks, category: 'Technology' },
  { id: 'keyboard-macro', name: 'Keyboard', url: keyboardMacro, category: 'Technology' },
  { id: 'fiber-optics', name: 'Fiber Optics', url: fiberOptics, category: 'Technology' },
  { id: 'motherboard', name: 'Motherboard', url: motherboard, category: 'Technology' },
  { id: 'data-center', name: 'Data Center', url: dataCenter, category: 'Technology' },
  { id: 'cpu-chip', name: 'CPU Chip', url: cpuChip, category: 'Technology' },
  { id: 'workstation-setup', name: 'Workstation', url: workstationSetup, category: 'Technology' },

  // Textures
  { id: 'marble-vein', name: 'Marble', url: marbleVein, category: 'Textures' },
  { id: 'weathered-wood', name: 'Weathered Wood', url: weatheredWood, category: 'Textures' },
  { id: 'rusted-metal', name: 'Rusted Metal', url: rustedMetal, category: 'Textures' },
  { id: 'concrete-wall', name: 'Concrete Wall', url: concreteWall, category: 'Textures' },
  { id: 'sand-ripples', name: 'Sand Ripples', url: sandRipples, category: 'Textures' },
  { id: 'slate-stone', name: 'Slate Stone', url: slateStone, category: 'Textures' },

  // Workspace
  { id: 'minimal-desk', name: 'Minimal Desk', url: minimalDesk, category: 'Workspace' },
  { id: 'workspace-laptop', name: 'Desk Flat-lay', url: workspaceLaptop, category: 'Workspace' }
]

const BANNER_MAP = new Map<string, string>()
for (const b of BANNER_IMAGES) {
  BANNER_MAP.set(b.id, b.url)
  BANNER_MAP.set(`${b.id}.jpg`, b.url)
  BANNER_MAP.set(`banner:${b.id}`, b.url)
}

export const BANNER_IMAGES_BY_CATEGORY: { category: BannerCategory; images: BannerImage[] }[] =
  BANNER_CATEGORIES.map((category) => ({
    category,
    images: BANNER_IMAGES.filter((b) => b.category === category)
  })).filter((group) => group.images.length > 0)

export function resolveCoverImage(coverImage: string | undefined): string | undefined {
  if (!coverImage) return undefined
  if (coverImage.startsWith('bg-gradient') || coverImage.startsWith('bg-')) {
    return coverImage
  }
  if (BANNER_MAP.has(coverImage)) {
    return BANNER_MAP.get(coverImage)
  }
  for (const b of BANNER_IMAGES) {
    if (coverImage.includes(b.id)) {
      return b.url
    }
  }
  return coverImage
}
