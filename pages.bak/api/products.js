export default function handler(req,res){
    const products = [
      {id:'p-nap-20', feedstock:'Napier', name:'Napier Pellets 20kg', pricePerKg:12.0, moisture:8, calorific:4200, minOrderKg:100, stockByRegion:{north:500,east:0,west:120,south:80}, leadTimeDays:3, supplier:'Cienergy'},
      {id:'p-gns-10', feedstock:'Groundnut shell', name:'Groundnut Shell Pellets 10kg', pricePerKg:15.5, moisture:6, calorific:4000, minOrderKg:50, stockByRegion:{north:0,east:300,west:200,south:20}, leadTimeDays:5, supplier:'Cienergy'},
      {id:'p-mus-25', feedstock:'Mustard stalk', name:'Mustard Stalk Pellets 25kg', pricePerKg:11.0, moisture:10, calorific:3800, minOrderKg:200, stockByRegion:{north:0,east:0,west:500,south:0}, leadTimeDays:14, supplier:'Cienergy'},
      {id:'p-cot-20', feedstock:'Cotton stalk', name:'Cotton Stalk Pellets 20kg', pricePerKg:13.2, moisture:9, calorific:3900, minOrderKg:100, stockByRegion:{north:20,east:60,west:0,south:0}, leadTimeDays:2, supplier:'Cienergy'},
      {id:'p-soy-20', feedstock:'Soya stalk', name:'Soya Stalk Pellets 20kg', pricePerKg:12.8, moisture:7, calorific:4050, minOrderKg:100, stockByRegion:{north:80,east:20,west:0,south:30}, leadTimeDays:4, supplier:'Cienergy'},
      {id:'p-cor-15', feedstock:'Coriander husk', name:'Coriander Husk Pellets 15kg', pricePerKg:16.0, moisture:5, calorific:4100, minOrderKg:50, stockByRegion:{north:0,east:120,west:40,south:10}, leadTimeDays:6, supplier:'Cienergy'},
      {id:'p-cane-25', feedstock:'Cane trash', name:'Cane Trash Pellets 25kg', pricePerKg:10.5, moisture:12, calorific:3700, minOrderKg:200, stockByRegion:{north:0,east:0,west:600,south:50}, leadTimeDays:10, supplier:'Cienergy'}
    ];
    res.status(200).json(products);
  }
  