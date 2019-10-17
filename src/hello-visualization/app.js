/* eslint-env browser */

import Halyard from 'halyard.js';
import angular from 'angular';
import enigma from 'enigma.js';
import enigmaMixin from 'halyard.js/dist/halyard-enigma-mixin';
import qixSchema from 'enigma.js/schemas/3.2.json';
import template from './app.html';
import Linechart from './linechart';
import 'babel-polyfill';

const halyard = new Halyard();

angular.module('app', []).component('app', {
  bindings: {},
  controller: ['$scope', '$q', '$http', function Controller($scope, $q, $http) {
    this.connected = false;
    this.painted = false;
    this.connecting = true;

    let app = null;
    let scatterplotObject = null;
    let linechartObject = null;

    const select = async (value) => {
      $scope.dataSelected = true;
      const layout = await this.getMovieInfo();
    };

    const linechartProperties = {
      qInfo: {
        qType: 'visualization',
        qId: '',
      },
      type: 'my-picasso-linechart',
      labels: true,
      qHyperCubeDef: {
        qDimensions: [{
          qDef: {
            qFieldDefs: ['time'],
            qSortCriterias: [{
              qSortByAscii: 1,
            }],
          },
        }],
        qMeasures: [{
          qDef: {
            qDef: 'Sum([use])',
            qLabel: 'Use (kW)',
          }
        },
        ],
        qInitialDataFetch: [{
          qTop: 0, qHeight: 50, qLeft: 0, qWidth: 3,
        }],
        qSuppressZero: false,
        qSuppressMissing: false,
      },
    };

    const linechart = new Linechart();

    const paintLineChart = (layout) => {
      linechart.paintLinechart(document.getElementById('chart-container-linechart'), layout);
      this.painted = true;
    };

    this.generateGUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // eslint-disable-next-line no-bitwise
      const r = Math.random() * 16 | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });

    this.$onInit = () => {
      const config = {
        Promise: $q,
        schema: qixSchema,
        mixins: enigmaMixin,
        url: `ws://${window.location.hostname}:19076/app/${this.generateGUID()}`,
      };

      // Add local data
      const filePathMovie = '/data/iot.csv';
      const tableMovie = new Halyard.Table(filePathMovie, {
        name: 'iot',
        fields: [
          { src: 'time', name: 'time' },
          { src: 'use', name: 'use' }
        ],
        delimiter: ',',
      });
      halyard.addTable(tableMovie);

      // Add web data
      (async () => {
        // const data = await $http.get('https://gist.githubusercontent.com/carlioth/b86ede12e75b5756c9f34c0d65a22bb3/raw/e733b74c7c1c5494669b36893a31de5427b7b4fc/MovieInfo.csv');
        // const table = new Halyard.Table(data.data, { name: 'MoviesInfo', delimiter: ';', characterSet: 'utf8' });
        // halyard.addTable(table);
        let qix;
        try {
          qix = await enigma.create(config).open();
          this.connected = true;
          this.connecting = false;
        } catch (error) {
          this.error = 'Could not connect to QIX Engine';
          this.connecting = false;
        }

        try {
          app = await qix.createSessionAppUsingHalyard(halyard);
        } catch (error) {
          this.error = 'Could not create session app';
          this.connected = false;
          this.connecting = false;
        }
        await app.getAppLayout();

        linechartObject = await app.createSessionObject(linechartProperties);
        const linechartUpdate = (async () => {
          const layout = await linechartObject.getLayout();
          paintLineChart(layout);
        });

        linechartObject.on('changed', linechartUpdate);
        linechartUpdate();
      })();
    };

    this.getMovieInfo = async () => {
      const tableProperties = {
        qInfo: {
          qType: 'visualization',
          qId: '',
        },
        type: 'my-info-table',
        labels: true,
        qHyperCubeDef: {
          qDimensions: [{
            qDef: {
              qFieldDefs: ['time'],
            },
          },
          {
            qDef: {
              qFieldDefs: ['use'],
            },
          }
          ],
          qInitialDataFetch: [{
            qTop: 0, qHeight: 50, qLeft: 0, qWidth: 50,
          }],
          qSuppressZero: false,
          qSuppressMissing: true,
        },
      };

      const model = await app.createSessionObject(tableProperties);
      return model.getLayout();
    };
  }],
  template,
});

angular.bootstrap(document, ['app']);
