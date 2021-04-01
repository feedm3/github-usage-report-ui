import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useDropzone } from "react-dropzone";

interface GithubUsageReportCsvEntry {
  actionsWorkflow: string
  date: string;
  pricePerUnit: string;
  product: string;
  quantity: number;
  repositorySlug: string;
  unitType: string;

  // gets calculated
  price: number;
}

/**
 * https://stackoverflow.com/a/52551910/3141881
 */
const camalize = (str: string): string => {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

/**
 * https://stackoverflow.com/a/11832950/3141881
 */
const roundPrice = (price: number): number => {
  return (Math.round(price * 100) / 100)
}

const formatPrice = (price: number): string => {
  return '$' + price.toFixed(2);
}

function App() {
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];

    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
      const csv = event.target!.result;

      Papa.parse<GithubUsageReportCsvEntry>(csv as any, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (name) => {
          return camalize(name);
        },
        complete: (results) => {
          const usageEntries = results.data;
          const usageData = usageEntries.map((entry) => {
            // first character is $
            const pricePerUnitTrimmed = entry.pricePerUnit.substring(1);
            const pricePerUnit = Number.parseFloat(pricePerUnitTrimmed);
            const price = pricePerUnit * entry.quantity;
            return {
              ...entry,
              price
            }
          })
          setData(usageData);
        }
      })
    };
  }, [])

  const [data, setData] = useState<GithubUsageReportCsvEntry[]>([]);
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, multiple: false})

  const totalPricePerDay = data.reduce((accumulator, usageEntry) => {
    const entry = accumulator.find(entry => entry.date === usageEntry.date);

    if (!entry) {
      accumulator.push({
        date: usageEntry.date,
        price: usageEntry.price
      });
    } else {
      entry.price = entry.price + usageEntry.price;
    }

    return accumulator;
  }, [] as { date: string, price: number }[]).map((entry) => {
    return {
      date: entry.date,
      price: entry.price
    };
  });

  const totalPrice = totalPricePerDay.reduce((total, current) => {
    return total + current.price;
  }, 0);


  return (
    <div>
      <h1>Github Usage Report UI</h1>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <p>Drop the usage report csv here ...</p> :
            <p>Drag 'n' drop the usage report here, or click to select it</p>
        }
      </div>
      {
        totalPricePerDay.length > 0 && (
          <>
            <p>From: {totalPricePerDay[0].date} to {totalPricePerDay[totalPricePerDay.length - 1].date}</p>
            <p>Total: {formatPrice(roundPrice(totalPrice))}</p>
            <BarChart width={800} height={300} data={totalPricePerDay}>
              <CartesianGrid stroke="#eee" strokeDasharray="5 5"/>
              <XAxis dataKey="date"/>
              <YAxis allowDecimals={true} tickFormatter={(value) => {
                return formatPrice(value)
              } } />
              <Tooltip formatter={(value: number) => {
                return formatPrice(value);
              }}/>
              <Bar type="monotone" dataKey="price" fill="#82ca9d"/>
            </BarChart>
          </>
        )
      }
    </div>
  );
}

export default App;
