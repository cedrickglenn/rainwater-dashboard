/**
 * Static display config for each sensor type.
 *
 * Colors here are only used as chart line accents. Status-driven coloring
 * (safe / warning / unsafe) is handled by the water-quality helpers — we do
 * NOT color sensor cards by sensor type.
 */

export const sensorMetadata = {
  ph: {
    icon: 'Droplets',
    description: 'Measures acidity/alkalinity of water',
  },
  turbidity: {
    icon: 'Eye',
    description: 'Measures water clarity and suspended particles',
  },
  tds: {
    icon: 'Beaker',
    description: 'Measures total dissolved solids in water',
  },
  temperature: {
    icon: 'Thermometer',
    description: 'Measures water temperature',
  },
};
