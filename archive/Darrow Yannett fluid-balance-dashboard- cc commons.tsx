/*
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
 * Copyright (c) 2024 Ian Victor Joseph Murray imurra@yahoo.com
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
 */

// TERMS AND CONDITIONS:

// 1. ATTRIBUTION: You must give appropriate credit to Ian Murray, provide a link to the license,
// and indicate if changes were made. You may do so in any reasonable manner, but not in any way
// that suggests the licensor endorses you or your use.

// 2. NON-COMMERCIAL: You may not use this material for commercial purposes. This includes but is not limited to:
//    - Using the software in commercial medical devices
//    - Incorporating the software into commercial educational products
//    - Using the software in for-profit medical training programs without explicit permission

// 3. EDUCATIONAL USE: This software is specifically designed for educational purposes in medical
// and healthcare education. You are free to:
//    - Use this in classroom settings
//    - Modify and adapt for educational purposes
//    - Share with other educators and students

// 4. SHARE ALIKE: If you remix, transform, or build upon the material, you must distribute your
// contributions under the same license as the original.

// 5. WARRANTY: This software is provided "as is" without warranty of any kind.

/*
 * For permissions beyond the scope of this license, please contact the author directly.
 * This is a human-readable summary of (and not a substitute for) the full license,
 * which can be found at: http://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
 */

import React, { useState, useEffect } from 'react';

const FluidBalanceDashboard = () => {
  const [solutionType, setSolutionType] = useState('isotonic');
  const [volumeChangePercent, setVolumeChangePercent] = useState(0);

  const baseECF = 14;
  const baseICF = 28;
  const baseOsmolarity = 290;

  const [ecfVolume, setEcfVolume] = useState(baseECF);
  const [icfVolume, setIcfVolume] = useState(baseICF);
  const [osmolarity, setOsmolarity] = useState(baseOsmolarity);

  useEffect(() => {
    const volumeChange = (baseECF + baseICF) * (volumeChangePercent / 100);
    let ecfChange = 0, icfChange = 0, osmoChange = 0;

    switch (solutionType) {
      case 'isotonic':
        ecfChange = volumeChange;
        break;
      case 'hypotonic':
        if (volumeChangePercent < 0) {
          ecfChange = volumeChange * 0.75;
          icfChange = -volumeChange * 0.25;
          osmoChange = -baseOsmolarity * (Math.abs(volumeChangePercent) / 100);
        } else {
          ecfChange = volumeChange * 0.75;
          icfChange = volumeChange * 0.25;
          osmoChange = -baseOsmolarity * (Math.abs(volumeChangePercent) / 100);
        }
        break;
      case 'hypertonic':
        if (volumeChangePercent < 0) {
          ecfChange = volumeChange;
          icfChange = volumeChange * 0.25;
          osmoChange = baseOsmolarity * (Math.abs(volumeChangePercent) / 100);
        } else {
          ecfChange = volumeChange;
          icfChange = -volumeChange * 0.25;
          osmoChange = baseOsmolarity * (Math.abs(volumeChangePercent) / 100);
        }
        break;
    }

    setEcfVolume(Math.max(0, baseECF + ecfChange));
    setIcfVolume(Math.max(0, baseICF + icfChange));
    setOsmolarity(Math.max(0, baseOsmolarity + osmoChange));
  }, [solutionType, volumeChangePercent]);

  const graphWidth = 150;
  const graphHeight = 200;
  const icfWidth = icfVolume * 5;
  const ecfWidth = ecfVolume * 5;
  const baseIcfWidth = baseICF * 5;
  const baseEcfWidth = baseECF * 5;

  const coloredHeight = Math.min(graphHeight, graphHeight * (osmolarity / 400));

  return (
    <div className="p-4 max-w-4xl mx-auto min-h-screen relative">
      <h1 className="text-2xl font-bold mb-4">Fluid Balance and Tonicity Demonstration</h1>
      
      <div className="mb-4">
        <h2>Controls</h2>
        <div className="mb-4">
          <label>Solution Type:</label>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <input type="radio" value="isotonic" id="isotonic" checked={solutionType === 'isotonic'} onChange={() => setSolutionType('isotonic')} />
              <label htmlFor="isotonic">Isotonic</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="radio" value="hypertonic" id="hypertonic" checked={solutionType === 'hypertonic'} onChange={() => setSolutionType('hypertonic')} />
              <label htmlFor="hypertonic">Hypertonic</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="radio" value="hypotonic" id="hypotonic" checked={solutionType === 'hypotonic'} onChange={() => setSolutionType('hypotonic')} />
              <label htmlFor="hypotonic">Hypotonic</label>
            </div>
          </div>
        </div>
        <div>
          <label>Volume Change: {volumeChangePercent}%</label>
          <div className="flex justify-between text-sm mt-1">
            <span>Contraction</span>
            <span>Expansion</span>
          </div>
          <input 
            type="range" 
            min="-50" 
            max="50" 
            value={volumeChangePercent} 
            onChange={(e) => setVolumeChangePercent(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-sm">
            <span>-50%</span>
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center items-start">
        <svg width={graphWidth * 2} height={graphHeight} viewBox={`0 0 ${graphWidth * 2} ${graphHeight}`}>
          {/* ICF Graph */}
          <g transform={`translate(${graphWidth - icfWidth}, 0)`}>
            <rect x={icfWidth - baseIcfWidth} y={graphHeight - coloredHeight} width={baseIcfWidth} height={coloredHeight} fill="#FFB3BA" opacity="0.3" />
            <rect x="0" y={graphHeight - coloredHeight} width={icfWidth} height={coloredHeight} fill="#FFB3BA" />
            {icfWidth > baseIcfWidth && (
              <rect 
                x={icfWidth - baseIcfWidth} 
                y={graphHeight - Math.min(coloredHeight, graphHeight * (baseOsmolarity / 400))} 
                width={baseIcfWidth} 
                height={Math.min(coloredHeight, graphHeight * (baseOsmolarity / 400))} 
                fill="none" 
                stroke="gray" 
                strokeWidth="1" 
                strokeDasharray="5,5" 
              />
            )}
            <text x={icfWidth / 2} y="30" fontSize="16" fill="black" textAnchor="middle">ICF</text>
          </g>

          {/* ECF Graph */}
          <g transform={`translate(${graphWidth}, 0)`}>
            <rect x="0" y={graphHeight - coloredHeight} width={baseEcfWidth} height={coloredHeight} fill="#BAFFC9" opacity="0.3" />
            <rect x="0" y={graphHeight - coloredHeight} width={ecfWidth} height={coloredHeight} fill="#BAFFC9" />
            {ecfWidth > baseEcfWidth && (
              <rect 
                x="0" 
                y={graphHeight - Math.min(coloredHeight, graphHeight * (baseOsmolarity / 400))} 
                width={baseEcfWidth} 
                height={Math.min(coloredHeight, graphHeight * (baseOsmolarity / 400))} 
                fill="none" 
                stroke="gray" 
                strokeWidth="1" 
                strokeDasharray="5,5" 
              />
            )}
            <text x={ecfWidth / 2} y="30" fontSize="16" fill="black" textAnchor="middle">ECF</text>
          </g>

          {/* Shared Y-axis */}
          <line x1={graphWidth} y1="0" x2={graphWidth} y2={graphHeight} stroke="black" strokeWidth="2" />
          <text x={graphWidth - 5} y="20" fontSize="12" fill="red" textAnchor="end" transform={`rotate(-90 ${graphWidth - 5} 20)`}>Osmolarity →</text>

          {/* X-axis labels */}
          <text x={graphWidth - 5} y={graphHeight - 5} fontSize="12" fill="blue" textAnchor="end">← Volume</text>
          <text x={graphWidth + 5} y={graphHeight - 5} fontSize="12" fill="blue" textAnchor="start">Volume →</text>

          {/* Base osmolarity line */}
          <line x1="0" y1={graphHeight - (baseOsmolarity / 400) * graphHeight} x2={graphWidth * 2} y2={graphHeight - (baseOsmolarity / 400) * graphHeight} stroke="red" strokeWidth="1" strokeDasharray="5,5" />

          {/* Current osmolarity line */}
          <line x1="0" y1={graphHeight - coloredHeight} x2={graphWidth * 2} y2={graphHeight - coloredHeight} stroke="red" strokeWidth="2" />
        </svg>

        <div className="ml-4">
          <h2>Cell in Beaker</h2>
          <svg width="150" height="120" viewBox="0 0 150 120">
            <rect x="0" y="0" width="150" height="120" fill="none" stroke="black" strokeWidth="2" />
            <circle cx="75" cy="60" r="25" fill="#FFB3BA" opacity="0.3" />
            <circle cx="75" cy="60" r={25 + (icfVolume - baseICF)} fill="#FFB3BA" />
            {icfVolume > baseICF && (
              <circle cx="75" cy="60" r="25" fill="none" stroke="gray" strokeWidth="1" strokeDasharray="5,5" />
            )}
            <rect x="0" y="70" width="150" height="50" fill="#BAFFC9" opacity="0.3" />
            <rect x="0" y={120 - (ecfVolume / baseECF) * 50} width="150" height={(ecfVolume / baseECF) * 50} fill="#BAFFC9" opacity="0.5" />
            {ecfVolume > baseECF && (
              <line x1="0" x2="150" y1="70" y2="70" stroke="gray" strokeWidth="1" strokeDasharray="5,5" />
            )}
          </svg>
        </div>
      </div>

      {/* License Footer */}
      <div className="fixed bottom-4 left-4 flex items-center space-x-2 bg-white bg-opacity-75 p-2 rounded-lg shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 121" className="h-6">
          {/* CC Circle */}
          <circle cx="158.3" cy="60.7" r="53" fill="none" stroke="black" strokeWidth="10"/>
          <circle cx="336" cy="60.7" r="53" fill="none" stroke="black" strokeWidth="10"/>
          {/* CC Text */}
          <text x="400" y="88" fontSize="90" fill="black">4.0</text>
          {/* BY-NC-SA icons simplified */}
          <path d="M71.5,89 L245,89" stroke="black" strokeWidth="10"/>
          <path d="M249,38 L71.5,38" stroke="black" strokeWidth="10"/>
          <path d="M158.3,60.7 m-23,-15 l23,30 l23,-30" fill="none" stroke="black" strokeWidth="10"/>
          <path d="M336,60.7 m-23,-15 l23,30 l23,-30" fill="none" stroke="black" strokeWidth="10"/>
        </svg>
        <span className="text-sm font-medium text-gray-800">CC BY-NC-SA</span>
      </div>
    </div>
  );
};

export default FluidBalanceDashboard;
