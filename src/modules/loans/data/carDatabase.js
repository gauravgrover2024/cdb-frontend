// src/modules/loans/data/carDatabase.js

export const carDatabase = [
  {
    make: "Toyota",
    models: [
      {
        name: "Fortuner",
        variants: ["2.8 4x2 AT", "2.8 4x4 AT", "2.4 4x2 MT"],
      },
      { name: "Innova", variants: ["2.4 MT", "2.4 AT"] },
      { name: "Creta", variants: ["1.6 MT", "1.6 AT"] },
    ],
  },
  {
    make: "Maruti Suzuki",
    models: [
      { name: "Swift", variants: ["1.2 MT", "1.2 AT"] },
      { name: "Alto", variants: ["0.8 MT", "1.0 AT"] },
      { name: "Baleno", variants: ["1.2 MT", "1.2 AT"] },
    ],
  },
  {
    make: "Hyundai",
    models: [
      { name: "Creta", variants: ["1.5 MT", "1.5 AT", "1.4 Petrol AT"] },
      { name: "i20", variants: ["1.2 MT", "1.2 AT"] },
      { name: "Venue", variants: ["1.2 MT", "1.0 AT"] },
    ],
  },
  {
    make: "Mahindra",
    models: [
      { name: "XUV700", variants: ["2.0 MT", "2.0 AT"] },
      { name: "Bolero", variants: ["1.5 MT", "1.5 AT"] },
      { name: "Scorpio", variants: ["2.2 MT", "2.2 AT"] },
    ],
  },
  {
    make: "Tata",
    models: [
      { name: "Nexon", variants: ["1.2 MT", "1.2 AT", "1.5 Diesel MT"] },
      { name: "Safari", variants: ["2.0 MT", "2.0 AT"] },
      { name: "Harrier", variants: ["2.0 MT", "2.0 AT"] },
    ],
  },
  {
    make: "Honda",
    models: [
      { name: "City", variants: ["1.5 MT", "1.5 AT"] },
      { name: "Jazz", variants: ["1.2 MT", "1.2 AT"] },
      { name: "CR-V", variants: ["2.0 AT"] },
    ],
  },
  {
    make: "Skoda",
    models: [
      { name: "Superb", variants: ["2.0 TDI MT", "2.0 TDI AT"] },
      { name: "Octavia", variants: ["2.0 TDI MT", "2.0 TDI AT"] },
    ],
  },
  {
    make: "Volkswagen",
    models: [
      { name: "Polo", variants: ["1.2 MT", "1.0 AT"] },
      { name: "Vento", variants: ["1.6 MT", "1.6 AT"] },
    ],
  },
  {
    make: "Kia",
    models: [
      { name: "Seltos", variants: ["1.5 MT", "1.5 AT"] },
      { name: "Sonet", variants: ["1.2 MT", "1.0 AT"] },
    ],
  },
  {
    make: "MG Motor",
    models: [
      { name: "Hector", variants: ["1.5 MT", "1.5 AT", "2.0 AT"] },
      { name: "ZS EV", variants: ["Single Speed AT"] },
    ],
  },
];

export const getMakesList = () => {
  return carDatabase.map((car) => car.make);
};

export const getModelsByMake = (make) => {
  const carMake = carDatabase.find((car) => car.make === make);
  return carMake ? carMake.models.map((model) => model.name) : [];
};

export const getVariantsByMakeAndModel = (make, model) => {
  const carMake = carDatabase.find((car) => car.make === make);
  if (!carMake) return [];
  const carModel = carMake.models.find((m) => m.name === model);
  return carModel ? carModel.variants : [];
};
