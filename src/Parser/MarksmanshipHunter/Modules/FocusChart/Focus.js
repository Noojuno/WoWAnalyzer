//Based on Main/Mana.js and Parser/VengeanceDemonHunter/Modules/PainChart

import React from 'react';
import PropTypes from 'prop-types';
import ChartistGraph from 'react-chartist';
import {Line} from 'react-chartjs-2';
import {Scatter} from 'react-chartjs-2';
import Chartist from 'chartist';
import 'chartist-plugin-legend';
import Chart from 'chart.js';
import makeWclUrl from 'common/makeWclUrl';
import SPELLS from 'common/SPELLS';

import specialEventIndicators from 'Main/Chartist/specialEventIndicators';

import { formatDuration } from 'common/format';

import 'Main/Mana.css';

import FocusComponent from './FocusComponent';
import './Focus.css';


const passiveWasteThresholdPercentage = .03; // (wasted passive focus generated) / (total passive focus generated), anything higher will trigger "CAN BE IMPROVED"
//TODO: get a "real" number approved by a MMS expert

class Focus extends React.PureComponent {
  static propTypes = {
    reportCode: PropTypes.string.isRequired,
    actorId: PropTypes.number.isRequired,
    start: PropTypes.number.isRequired,
    end: PropTypes.number.isRequired,
    playerHaste: PropTypes.number.isRequired,
    focusMax: PropTypes.number,
    passiveWaste: PropTypes.array,
    tracker : PropTypes.number,
    secondsCapped: PropTypes.number,
    activeFocusGenerated: PropTypes.object,
    activeFocusWasted: PropTypes.object,
    generatorCasts: PropTypes.object,
    activeFocusWastedTimeline: PropTypes.object,
  };

  constructor() {
    super();

    this.state = {
      bossHealth: null,
    };
	
  }

  componentWillMount() {
    this.load(this.props.reportCode, this.props.actorId, this.props.start, this.props.end);      
    }

  componentWillReceiveProps(newProps) {
    if (newProps.reportCode !== this.props.reportCode || this.props.focusMax !== this.props.focusMax || this.props.tracker !== this.props.tracker || newProps.actorId !== this.props.actorId || newProps.start !== this.props.start || newProps.end !== this.props.end) {
      this.load(newProps.reportCode, newProps.actorId, newProps.start, newProps.end);
    }
  }
  load(reportCode, actorId, start, end) {

    const bossHealthPromise = fetch(makeWclUrl(`report/tables/resources/${reportCode}`, {
      start,
      end,
      sourceclass: 'Boss',
      hostility: 1,
      abilityid: 1000,
    }))
      .then(response => response.json())
      .then((json) => {
        if (json.status === 400 || json.status === 401) {
          throw json.error;
        } else {
          this.setState({
            bossHealth: json,
          });
        }
      });

    return Promise.all([bossHealthPromise]);
  }

  render() {
    if (!this.state.bossHealth) {
      return (
        <div>
          Loading...
        </div>
      );
    }


    const focusGen = Math.round((10 + .1 * this.props.playerHaste / 375)*100)/100; //TODO: replace constant passive FocusGen (right now we don't account for lust/hero or Trueshot)

    const maxFocus = this.props.focusMax;
    const { start, end } = this.props;

    //not it's own module since it's "fake data" meant to look visually accurate, not be numerically accurate
  	const passiveCap = this.props.secondsCapped; //counts time focus capped (in seconds)
  	let lastCatch = 0; //records the timestamp of the last event
  	const overCapBySecond = [];
    const focusBySecond = [];
    const magicGraphNumber = Math.floor(maxFocus / 2);
    let passiveWasteIndex = 0;
    if (this.props.passiveWaste && this.props.activeFocusWastedTimeline){
      this.props.passiveWaste.forEach((item) => {
        const secIntoFight = Math.floor(passiveWasteIndex / 1000);
        if (Math.max(focusBySecond[secIntoFight], item) >= magicGraphNumber){ //aims to get highest peak
         focusBySecond[secIntoFight] = Math.max(focusBySecond[secIntoFight], item);
        }
        else if (Math.max(focusBySecond[secIntoFight], item) < magicGraphNumber){ //aims to get lowest valley
         focusBySecond[secIntoFight] = Math.min(focusBySecond[secIntoFight], item);
        }
        else if (!focusBySecond[secIntoFight]){
          focusBySecond[secIntoFight] = item;
        }
        lastCatch = Math.floor(passiveWasteIndex / 1000);
        passiveWasteIndex ++;
      });
      for (let i = 0; i < lastCatch; i++){ //extrapolates for passive focus gain
        if (!focusBySecond[i]){
          if (focusBySecond[i - 1] > maxFocus - focusGen){
            focusBySecond[i] = maxFocus;
          }
          else{
            focusBySecond[i] = focusBySecond[i-1] + focusGen;
          }
        }
        if (focusBySecond[i] >= maxFocus){
          if (this.props.activeFocusWastedTimeline[i]){
            overCapBySecond[i] = focusGen + this.props.activeFocusWastedTimeline[i];          }
          else{
            overCapBySecond[i] = focusGen;
          }
        }
        else if (this.props.activeFocusWastedTimeline[i] && focusBySecond[i] + this.props.activeFocusWastedTimeline[i] > maxFocus){
          overCapBySecond[i] = (focusBySecond[i] + this.props.activeFocusWastedTimeline[i]) - maxFocus;
        }
        else{
          overCapBySecond[i] = 0;
        }
      }
    }

		
    const bosses = [];
    const deadBosses = [];
    this.state.bossHealth.series.forEach((series) => {
      const newSeries = {
        ...series,
        data: {},
      };

      series.data.forEach((item) => {
        const secIntoFight = Math.floor((item[0] - start) / 1000);

        if (deadBosses.indexOf(series.guid) === -1) {
          const health = item[1];
          newSeries.data[secIntoFight] = health;

          if (health === 0) {
            deadBosses.push(series.guid);
          }
        }
      });
      bosses.push(newSeries);
    });
    const deathsBySecond = {};
    this.state.bossHealth.deaths.forEach((death) => {
      const secIntoFight = Math.floor((death.timestamp - start) / 1000);

      if (death.targetIsFriendly) {
        deathsBySecond[secIntoFight] = true;
      }
    });


    const abilitiesAll = {};
    const categories = {
      generated: 'Focus Generators',
      //spent: 'Focus Spenders', //I see no reason to display focus spenders, but leaving this in if someone later wants to add them
    };
    if(this.props.generatorCasts && this.props.activeFocusWasted && this.props.activeFocusGenerated){
      Object.keys(this.props.generatorCasts).forEach((generator) => {
        const spell = SPELLS[generator];
        abilitiesAll[`${generator}_gen`] = {
        ability: {
          category: 'Focus Generators',
          name: spell.name,
          spellId: Number(generator),
        },
        casts: this.props.generatorCasts[generator],
        created: this.props.activeFocusGenerated[generator],
        wasted: this.props.activeFocusWasted[generator],
        };

      });
    }

    const abilities = Object.keys(abilitiesAll).map(key => abilitiesAll[key]);
    abilities.sort((a, b) => {
      if (a.created < b.created) {
        return 1;
      } else if (a.created === b.created) {
        return 0;
      }
      return -1;
    });

    const fightDurationSec = Math.floor((end - start) / 1000);
    const labels = [];
    for (let i = 0; i <= fightDurationSec; i += 1) {
      labels.push(i);

      focusBySecond[i] = focusBySecond[i] !== undefined ? focusBySecond[i] : null;
      overCapBySecond[i] = overCapBySecond[i] !== undefined ? overCapBySecond[i] : null;
      bosses.forEach((series) => {
        series.data[i] = series.data[i] !== undefined ? series.data[i] : null;
      });
      deathsBySecond[i] = deathsBySecond[i] !== undefined ? deathsBySecond[i] : undefined;
    }
	  const wastedFocus = Math.round(passiveCap * focusGen);
	  const totalFocus = Math.floor(fightDurationSec * focusGen);
	  let ratingOfPassiveWaste = "";
  	if ( passiveCap / totalFocus > passiveWasteThresholdPercentage){
  		ratingOfPassiveWaste = "Can be improved.";
  	}
	  const totalWasted = [totalFocus,wastedFocus,ratingOfPassiveWaste];

    const chartData = {
      labels,
      series: [
        ...bosses.map((series, index) => ({
          className: `boss-health boss-${index} boss-${series.guid}`,
          name: `${series.name} Health`,
          data: Object.keys(series.data).map(key => series.data[key]),
        })),
        {
          className: 'pain',
          name: 'Focus',
          data: Object.keys(focusBySecond).map(key => (focusBySecond[key])),
        },
        {
          className: 'wasted',
          name: 'Focus wasted',
          data: Object.keys(overCapBySecond).map(key => overCapBySecond[key]),
        },
      ],
    };
    let maxX = 0;
    const focusBySecondCoord = [];
    for (maxX = 0; maxX < focusBySecond.length; maxX++){
      focusBySecondCoord.push({x:maxX,y:focusBySecond[maxX]});
    }
    const overCapBySecondCoord = [];
    for (let i = 0; i < overCapBySecond.length; i++){
      overCapBySecondCoord.push({x:i,y:overCapBySecond[i]});
    }
    let step = 0;
    /* CHARTJS- on hold for now while I learn how to do it better */
    const myData = {
        datasets: [{
          label: 'Focus',
          data: focusBySecondCoord,
          backgroundColor: [
           'rgba(0, 139, 215, 0.2)',
           ],
          borderColor: [
            'rgba(0,145,255,1)',
          ],
          borderWidth: 2
        },
        {
          label: 'Wasted Focus',
          data: overCapBySecondCoord,
          backgroundColor: [
           'rgba(2255,20,147, 0.3)',
           ],
          borderColor: [
            'rgba(255,90,160,1)',
          ],
          borderWidth: 2
        }],

      };
    const chartOptions = {
      lineTension: 0,
      elements:{
          point:{radius:0}
        },
      scales: {
        xAxes: [{
          ticks: {
            beginAtZero:true,
            stepSize: 30,//stepSize, actually
            max: maxX - 1,
          },
          gridLines:{
            color: 'rgba(255,255,255,0.7)',
            borderDash: [2, 2],
          },
          type: 'linear',
          position: 'bottom',
          beginAtZero: true,
        }],
        yAxes: [{
          gridLines:{
            color: 'rgba(255,255,255,0.7)',
            borderDash: [2, 2],
          },
          type: 'linear',
          ticks: {
            beginAtZero:true,
            stepSize: 30,
            max: maxFocus,
          }
        }]
      }
    }

      /*
    }
    var ctx = "myChart";
    var scatterChart = new Chart(ctx, {
      type: 'line',
      data: myData,
      options: {
        elements:{
          point:{radius:0}
        },
        scales: {
          xAxes: [{
            gridLines:{
              color: "#FFFFFF",
              borderDash: [2, 2],
            },
            type: 'linear',
            position: 'bottom',
            beginAtZero: true,
          }],
          yAxes: [{
            gridLines:{
              color: "#FFFFFF",
              borderDash: [2, 2],
            },
            ticks: {
              beginAtZero:true,
              stepSize: 25,//stepSize, actually
            }
          }]
        }
      }
    });
*/
    return(
      <div>
            <Line 
        data = {myData}
        options = {chartOptions}  
              />

                      <FocusComponent
          abilities={abilities}
          categories={categories}
          passive = {(totalWasted)}
          overCapBySecondCoord = {overCapBySecondCoord}
          focusBySecondCoord = {focusBySecondCoord}
        />
        </div>
      );
    return (
      <div> 
        <ChartistGraph
          data={chartData}
          options={{
            low: 0,
            high: 125,
            showArea: true,
            showPoint: false,
            fullWidth: true,
            height: '300px',
            lineSmooth: Chartist.Interpolation.simple({
              fillHoles: true,
            }),
            axisX: {
              labelInterpolationFnc: function skipLabels(seconds) {
                if (seconds < ((step - 1) * 30)) {
                  step = 0;
                }
                if (step === 0 || seconds >= (step * 30)) {
                  step += 1;
                  return formatDuration(seconds);
                }
                return null;
              },
              offset: 20,
            },
            axisY: {
              onlyInteger: true,
              offset: 35,
              labelInterpolationFnc: function skipLabels(percentage) {
                return `${percentage}`;
              },
            },
            plugins: [
              Chartist.plugins.legend({
                classNames: [
                  ...bosses.map((series, index) => `boss-health boss-${index} boss-${series.guid}`),
                  'pain',
                  'wasted',
                ],
              }),
              specialEventIndicators({
                series: ['death'],
              }),
            ],
          }}
          type="Line"
        />
        <FocusComponent
          abilities={abilities}
          categories={categories}
		      passive = {(totalWasted)}
          overCapBySecondCoord = {overCapBySecondCoord}
          focusBySecondCoord = {focusBySecondCoord}
        />
      </div>
    );


  }
}

export default Focus;
