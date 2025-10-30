# Smart Farm Image Assets Guide

This guide shows you exactly where to place your PNG/JPG image assets to match the design.

## Folder Structure

Create these folders in your `public` directory:

\`\`\`
public/
├── images/
│   ├── backgrounds/
│   ├── buttons/
│   ├── icons/
│   ├── robots/
│   ├── animals/
│   ├── badges/
│   ├── rewards/
│   ├── items/
│   ├── charts/
│   ├── diagrams/
│   └── headers/
\`\`\`

## Asset Placement Guide

### Backgrounds
- `public/images/backgrounds/welcome-bg.jpg` - Welcome page farm landscape
- `public/images/backgrounds/select-bg.jpg` - Selection page with building
- `public/images/backgrounds/dashboard-bg.jpg` - Dashboard farm background
- `public/images/backgrounds/sidebar-bg.png` - Sidebar brown/orange texture

### Logos & Headers
- `public/images/logo.png` - Circular KidzTechCentre logo (80x80px)
- `public/images/header-logo.png` - Full KidzTechCentre header with text (400x80px)
- `public/images/sidebar-logo.png` - "SMART FARM" text logo for sidebar (150x80px)
- `public/images/headers/dashboard-header.png` - "SMART FARMING DASHBOARD" banner

### Buttons
- `public/images/buttons/start-button.png` - Orange "START" button with arrow
- `public/images/buttons/home-button.png` - Orange home icon button
- `public/images/buttons/logout-button.png` - "LOG OUT" button
- `public/images/buttons/water-plant-button.png` - Water droplet button
- `public/images/buttons/schedule-watering-button.png` - Clock/schedule button
- `public/images/buttons/run-fan-button.png` - Fan icon button
- `public/images/buttons/toggle-light-button.png` - Light bulb button
- `public/images/buttons/scarecrow-button.png` - Scarecrow button
- `public/images/buttons/nav-button-active.png` - Active navigation button (optional)
- `public/images/buttons/nav-button-inactive.png` - Inactive navigation button (optional)

### Robots
- `public/images/robots/farmer-robot.png` - Robot in farmer outfit with straw hat
- `public/images/robots/house-robot.png` - Robot in house/tech outfit
- `public/images/robots/factory-robot.png` - Robot in factory/engineer outfit
- `public/images/robots/robot-avatar.png` - Small robot avatar for history
- `public/images/robots/robot-with-hat.png` - Robot with pink hat for motion sensor

### Icons
- `public/images/icons/thermometer.png` - Temperature thermometer icon
- `public/images/icons/sun.png` - Sun/sunshine icon
- `public/images/icons/fire.png` - Fire/heat icon
- `public/images/icons/water-drop.png` - Water droplet icon
- `public/images/icons/soil-moisture.png` - Soil moisture sensor icon
- `public/images/icons/light.png` - Light/brightness icon
- `public/images/icons/temperature.png` - Temperature icon
- `public/images/icons/humidity.png` - Humidity/wind icon
- `public/images/icons/soil-moisture-sensor.png` - Soil sensor diagram
- `public/images/icons/temperature-sensor.png` - Temperature sensor diagram
- `public/images/icons/light-sensor.png` - Light sensor diagram
- `public/images/icons/motion-sensor.png` - Motion sensor diagram

### Animals
- `public/images/animals/chicken.png` - Chicken/rooster image
- `public/images/animals/butterfly.png` - Butterfly image

### Badges & Rewards
- `public/images/badges/badge-1.png` - Achievement badge 1
- `public/images/badges/badge-2.png` - Achievement badge 2
- `public/images/badges/badge-3.png` - Achievement badge 3
- `public/images/badges/badge-4.png` - Achievement badge 4
- `public/images/rewards/trophy-coins.png` - Trophy with coins
- `public/images/rewards/trophy.png` - Golden trophy

### Items
- `public/images/items/plant-pot.png` - Plant in pot
- `public/images/items/water-tank.png` - Water tank/container

### Charts & Diagrams
- `public/images/charts/plant-health-chart.png` - Plant health graph/chart
- `public/images/diagrams/plant-growth-cycle.png` - Plant growth cycle diagram with sun, plant, water

### User
- `public/images/user-avatar.png` - User profile avatar

## Quick Replace Instructions

1. **Extract your assets** from the design files
2. **Rename them** to match the filenames above
3. **Place them** in the corresponding folders
4. **Refresh the browser** - Next.js will automatically load the new images!

## Tips

- Use PNG format for images with transparency (logos, icons, buttons)
- Use JPG format for full backgrounds (better compression)
- Recommended sizes:
  - Backgrounds: 1920x1080px or larger
  - Buttons: 200-300px wide
  - Icons: 64-128px
  - Logos: As specified in the guide

## Fallback

If an image is missing, the app will show a placeholder. Simply add the image to the correct path and it will appear automatically.
