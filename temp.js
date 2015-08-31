/*global jQuery:false */
/*global huawei:false */
/*global sap:false */
/*global localStorage:false */
/*global setTimeout:false */
/*global $:false */
/*global window:false */
/*global document:false */


(function () {
  "use strict";

  jQuery.sap.declare("huawei.cmes.quality.QualityPage");
  //jQuery.sap.require("huawei.cmes.fragment.quality.Report");
  jQuery.sap.require("huawei.cmes.util.settings.Authorization");
  jQuery.sap.require("huawei.cmes.util.parameters.QualityChartsParameters");
  jQuery.sap.require("huawei.cmes.util.commons.Formatters");
  jQuery.sap.require("huawei.cmes.util.chart.Helper");
  jQuery.sap.require("huawei.cmes.util.services.Provider");
  jQuery.sap.require("huawei.cmes.util.services.Proxy");
  jQuery.sap.require("huawei.cmes.control.charts.QualityCharts");
  jQuery.sap.require("huawei.cmes.control.charts.KPIChart");
  jQuery.sap.require("huawei.cmes.control.Filter.MESFilter");
  jQuery.sap.require("huawei.cmes.util.services.Http");
  jQuery.sap.require("sap.ui.core.format.DateFormat");
  jQuery.sap.require("huawei.cmes.quality.setting.Config");

  var PROXY = huawei.cmes.util.services.Proxy;
  var QUALITY_SERVICE = huawei.cmes.util.services.Provider.QualityService;
  var QUALITY_ODATA = huawei.cmes.util.services.Provider.QualityOData;
  var HTTP = huawei.cmes.util.http;
  var HELPER = huawei.cmes.util.commons.Helper;
  var CHART_HELPER = huawei.cmes.util.chart.Helper;
  var AUTHORIZATION = huawei.cmes.util.settings.Authorization;

  sap.ui.controller(
    "huawei.cmes.quality.view.QualityPage",

    /**
     * @author lWX209333
     * $("#__xmlview0--Column2ChartVBox .v-row[class*='ID_0'] text").text(':');
     *
     */
    {
      pageName: 'quality',
      onInit: function () {

        this.initCategory();
        this.initialURLs();

        this.initMappings();
        this.initGlobalTime();

        AUTHORIZATION.checkAuthorization('quality');
        /**
         * Fragments
         */
        this._chartDlg = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.Sub1ChartDlg", this);
        this._dimensionDDL = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.DimensionDDL", this);
        this._warnMsgDlg = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.WarningMsg", this);
        this._defectChartTypePopover = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.DefectChartTypePopover", this);
        this._reportPage = sap.ui.jsfragment(
          "huawei.cmes.fragment.quality.Report", this);
        if (sap.ui.getCore().byId("InformationDlg") !== undefined) {
          sap.ui.getCore().byId("InformationDlg").destroy();
        }
        this.informationMsg = sap.ui.xmlfragment(
          "huawei.cmes.fragment.commons.InformationMsg", this);
        this.getView().addDependent(this.informationMsg);
        this.getView().addDependent(this._chartDlg);
        this.getView().addDependent(this._dimensionDDL);
        this.getView().addDependent(this._warnMsgDlg);
        this.getView().addDependent(this._defectChartTypePopover);
        this.getView().addDependent(this._reportPage);


        this.bus = sap.ui.getCore().getEventBus();

        this.languageSetting();
        this.initPage();

      },

      /**
       * Ajax Get Method
       *
       * @param url
       * @param model
       * @param func
       */
      ajaxGet: HTTP.ajaxGet,
      deepClone: HELPER.deepClone,


      onReportOpen: function (oEvent) {
        this._reportPage.open();
      },

      /**
       * Initial Service URLs
       */
      initialURLs: function () {
        //get the 
        this._dimValueService = QUALITY_SERVICE.getm;
        this._settingService = QUALITY_SERVICE.getDimColloection;

        //URL to get all dimensions of a KPI for build filter
        this._filterDims = QUALITY_SERVICE.getv;

        //URL for tiles' data on first column
        this._column1Service = QUALITY_SERVICE.getKPIL1;

        //URL for color set on tile data
        this._column1ColorService = QUALITY_SERVICE.getKPIL1RYG;

        //URL for KPI Charts on second column
        this._column2Service = QUALITY_SERVICE.getKPIL2;

        //URL for Dimension Charts on third column
        this._column3Service = QUALITY_SERVICE.getKPIL3;

        this._kpiNameService = QUALITY_ODATA.kpiName;
      },


      /**
       * Initialize the category: network - default
       */
      initCategory: function () {
        var kpiType = huawei.cmes.util.commons.Helper
          .getURLParameters('kpiType');
        if (kpiType) {
          if (kpiType !== '00' && kpiType !== '01') {
            sap.ui.commons.MessageBox.alert(
              'URL Invalid Parameter Value For: kpiType');
            this._sCategory = 0;
            sap.category = this._sCategory;
          } else {
            this._sCategory = parseInt(kpiType.charAt(1));
            sap.category = this._sCategory;
          }
        } else {
          this._sCategory = 0;
          sap.category = this._sCategory;
        }
      },

      /**
       * Index for charts display
       * @type {Number}
       */
      initIndexes: function () {

        //index for tile on column1
        this.c1 = 0;
        //index for charts on column2
        this.c2 = 0;
        this.selectedDim = 0;
        this.sPagesize = 2; // page size for carousel on column2
        this.loaded = 0;
      },

      /**
       * KPI mapping info
       */
      initMappings: function () {
        this.initIndexes();

        this._tileColors = [];
        this._tileData = [];
        this._kpiNames = [];
        this._orgKpiNames = [];

        //YAxis adjust
        this._yaxis = [];

        //Global build chart filter
        this._sqlFilter = "";

        this._kpiCharts = []; // kpi charts on column 2
        this._dimCharts = []; // sub-dimension charts on column 3

        //Defect charts 
        this._dimOrgValues = [];
        this._selectedDims = [];

        this._defectTypes = ["defect_phenomenon", "defect_causes"];
        this._defectIndex = 0; //select 'Defect Phenomenon' as default
        this._curDefectChart = null; //selected defect chart 
        this._defectType = "pie"; //the default defect chart type - 'pie'
        this._defectReload = true;

      },

      languageSetting: function () {
        this._sLocale = localStorage.getItem('LANG-KEY') || '';
        this.oBundle = jQuery.sap.resources({
          url: "i18n/messageBundle.properties",
          locale: this._sLocale
        });
        if (sLocale === 'en-US') {
          sap.ui.getCore().getConfiguration().setLanguage('en-US');
        } else {
          sap.ui.getCore().getConfiguration().setLanguage('zh-CN');
        }

      },



      /**
       * Generate tiles and charts on the page
       */
      onAfterRendering: function () {

        this.initialSettings();

        var that = this;

        this.showDateSelected();
        
        var execToolTip = function () {
          //          alert('Working Now!');
          that.initTooltip();
        };
        setInterval(execToolTip, 2000);

        $(window).resize(function () {
          that.loadColumn2Carousel();
          that.adjustTileIconShown();
        });
      },

      adjustTileIconShown: function () {
        var id = '#' + this.byId('tile-list').getId();
        if ($(window).width() < 1195) {
          setTimeout(function () {
            $(id).find('.sapUiIcon').fadeOut();
          }, 300);
        } else {
          setTimeout(function () {
            $(id).find('.sapUiIcon').fadeIn();
          }, 300);
        }
      },

      initTooltip: function () {
        $('.v-row').hover(function (evt) {
          sap.evt = evt;
          var title = evt.currentTarget.querySelector('title');
          var text = evt.currentTarget.querySelector('text');
          var showtext = '';

          var posotionX = evt.clientX;
          var posotionY = evt.clientY - 30;

          if (title) {
            showtext +=
              '<span class="tooltip" style="left:' +
              posotionX + 'px;top:' + posotionY + 'px">' + title.textContent +
              '</span>';
          } else {
            if (text) {
              showtext +=
                '<span class="tooltip" style="left:' +
                posotionX + 'px;top:' + posotionY + 'px">' + text.textContent +
                '</span>';
            }
          }

          $('body').append(showtext);

        }, function () {
          $('.tooltip').remove();
        });
        $(window).bind('mousewheel DOMMouseScroll', function (event) {
          $('.tooltip').remove();
        });
      },

      //TODO
      initialSettings: function () {
        $('#idViewRoot--idApp-MasterBtn').remove();
        var kpiType = huawei.cmes.util.commons.Helper
          .getURLParameters('kpiType');
        // console.log(kpiType);
        if (kpiType === '00') {
          this.byId('CategorydecriptionSWT').setState(false);
        } else if (kpiType === '01') {
          this.byId('CategorydecriptionSWT').setState(true);
        }

      },


      /**
       * Initialize Quality Charts
       */
      initPage: function () {
        /*      
        var inforCollection = huawei.cmes.util.settings.Authorization.getLoginInfor("PAGE","HOME");
        if(inforCollection === false){
            var msg = "LOGIN_FAILED";
            sap.ui.getCore().byId("information-msg").setText(this.oBundle.getText(msg));
              this.informationMsg.open();
              throw new Error("Login failed: "+ this.oBundle.getText(msg));
        }
        
        set default start/end/period on global time filter
    */

        sap.ui.getCore().byId("QualityComponent").setBusy(true);
        this.getView().byId("ChartRow").setVisible(false);
        sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(
          false);

        //If succeed to get all kpi names, drawPage
        this.getAllKPINames();
        setInterval(function () {
          	HELPER.checkSessionExpiration();
        }, 1000);
      },

      /**
       * Initialize the time and period used to query data
       */
      initGlobalTime: function () {
        /**
         * Global time filter
         * @type {String}
         * default - date: previous 12 months
         * default - period: month
         */
        this._tmpPeriod = null;
        this._tmpStartDate = null;
        this._tmpEndDate = null;

        if (this._tileStartDate !== undefined) return;

        var curDate = new Date();

        //        HELPER.getLastMonth(curDate);
        var eYear = curDate.getFullYear();
        var eMonth = curDate.getMonth() + 1;
        var eDay = curDate.getDate();


        var todayDate = new Date();
        var startYear = todayDate.getFullYear();
        var startMonth = todayDate.getMonth();

        var thisMonth15 = startYear + '/' + (startMonth + 1) + '/15';

        //14Month Ago
        var startTime = new Date(new Date(thisMonth15).getTime() - 2592000000 * 13);
        var firstDayOfMonth = new Date(new Date(startTime).setDate('01'));

        var sMonth = firstDayOfMonth.getMonth() + 1;
        var sYear = firstDayOfMonth.getFullYear();
        var sDay = "01";

        eMonth = eMonth > 9 ? eMonth : "0" + eMonth;
        sMonth = sMonth > 9 ? sMonth : "0" + sMonth;
        eDay = eDay > 9 ? eDay : "0" + eDay;


        this._globalEndDate = eYear + "-" + eMonth + "-" + eDay;
        this._globalStartDate = sYear + "-" + sMonth + "-" + sDay;

        this._tileStartDate = this._globalStartDate;
        this._tileEndDate = this._globalEndDate;
        this._globalPeriod = "MONTH";
        this._globalPeriodLegend = "ActualValue";
        
        sap.startDate = this._tileStartDate;
      },


      /*******************************************************************
       * *****Data Binding
       ******************************************************************/
      /**
       * Initialize charts on column 1 and 2
       */
      getAllKPINames: function () {
        var that = this;
        var oDataURL = huawei.cmes.util.services.Proxy
          .XsodataProxy(this._kpiNameService);
        var oFilter =
          "/master_kpi?$filter=COMPONENT_KEY eq 'QUALITY' and KPI_TYPE eq '" +
          this._sCategory + "' and ENABLE_TAG eq '1'";

        var info = [];

        var dataHandler = function (oData, info) {
          sap.ui.getCore().byId("QualityComponent").setBusy(false);
          that.getView().byId("ChartRow").setVisible(true);
          info = oData.d.results;

          for (var i = 0; i < info.length; i++) {
            //only the data with COMPONENT_ID = 1 is useful
            if (info[i].COMPONENT_ID != 1) {
              continue;
            }
            //info[i].KPI_TYPE: 0 Network, 1 Terminal
            //that._kpiNames£º kpinames 
            if (that._kpiNames[info[i].KPI_TYPE] === undefined) {
              that._kpiNames[info[i].KPI_TYPE] = [];
            }

            // e.g. 0: material quality, 1: process quality , 2: customer quality
            var sbIndex = info[i].SUB_COMPONENT_ID.substr(
              info[i].SUB_COMPONENT_ID.length - 1, 1);
            sbIndex = parseInt(sbIndex) - 1;
            if (sbIndex < 0) {
              continue;
            };

            if (that._kpiNames[info[i].KPI_TYPE][sbIndex] === undefined) {
              that._kpiNames[info[i].KPI_TYPE][sbIndex] = [];
            }

            //info[i].KPI_TYPE - network/terminal
            //sbIndex - incoming material quality, in process quality.....
            //00315717 change TPY into FPY while network;change TPY into PY while terimal
            var KPI_KEY = info[i].KPI_KEY;
            if (KPI_KEY === 'TPY' && that._sCategory === 0) {
              KPI_KEY = 'FPY';
            } else if (KPI_KEY === 'TPY' && that._sCategory === 1) {
              KPI_KEY = 'PY';
            }
            that._kpiNames[info[i].KPI_TYPE][sbIndex].push(KPI_KEY);
          }

          that.drawPage();
          $('.v-clippath').remove();
        };

        this.ajaxGet(oDataURL + oFilter, info, dataHandler);
      },

      /**
       * getTileData data binding for tiles on first column
       */
      getTileData: function () {
        var that = this;
        var tileVBox = this.getView().byId("TileVBox");
        var oModel = new sap.ui.model.json.JSONModel();
        tileVBox.setModel(oModel);


        /*  setTimeout(tileVBox.setBusy(false), 30 * 1000);*/

        var kpiReqURL = PROXY.XsjsProxy(this._column1Service);
        kpiReqURL +=
          "?Component=QUALITY" +
          "&Datef=" + this._tileStartDate +
          "&Datet=" + this._tileEndDate +
          "&KType=" + this._sCategory;

        var kpiDataHandler = function (oData, tileVBox) {
          var tileData = [];
          var subComps = [];
          var icons = huawei.cmes.quality.setting.Config.tileIcons;
          var index = 0;
          var tile = {};
          var tileUnit = '';

          for (var i = 0; i < oData.length; i++) {

            index = subComps.indexOf(oData[i].SUB_COMPONENT_NAME);
            tileUnit = oData[i].UNIT === "PCS" ? that.oBundle.getText("PCS_Q") : oData[i].UNIT;
            if (index < 0) {
              subComps.push(oData[i].SUB_COMPONENT_NAME);
              tile = {
                "SUB_COMPONENT_NAME": oData[i].SUB_COMPONENT_NAME,
                "ICON": icons[subComps.length - 1],
                "KPIs": [{
                  //                  "KPI_NAME": {
                  //          path : oData[i].KPI_NAME,
                  //          formatter : huawei.cmes.util.commons.Formatters
                  //                  },
                  "KPI_NAME": that.oBundle.getText(oData[i].KPI_NAME),
                  "KPI_VALUE": oData[i].KPI_VALUE,
                  "UNIT": tileUnit
                }]
              };
              tileData.push(tile);
            } else {
              tile = tileData[index];
              tile.KPIs.push({
                "KPI_NAME": that.oBundle.getText(oData[i].KPI_NAME),
                "KPI_VALUE": oData[i].KPI_VALUE,
                "UNIT": tileUnit
              });
            }
          }

          //that._sCategory - network / terminal
          tileVBox.getModel().setData(tileData);
          //save the tile data of current category, for example network, to improve the performance
          that._tileData[that._sCategory] = tileData;
          //Set the tile value color based on loaded data
          that.setTileColor();
          tileVBox.setBusy(false);
          setTimeout(function () {
            that.adjustTileIconShown();
            $('.v-clippath').remove();
          }, 200);
        };

        if (this._tileData[this._sCategory] === undefined) {
          tileVBox.setBusy(true);
          this.ajaxGet(kpiReqURL, tileVBox, kpiDataHandler);
        } else {
          tileVBox.getModel().setData(this._tileData[this._sCategory]);
          this.setTileColor();
        }

      },

      /**
       * setTileColor set color for kpi values on tiles based on the dat
       */
      setTileColor: function () {
        var tileVBox = this.getView().byId("TileVBox");
        var tileItems = tileVBox.getItems()[0].getItems();

        for (var i = 0; i < tileItems.length; i++) {
          if (i === tileItems.length - 1) {
            tileItems[i].addStyleClass("last-tile-itme");
          } else {
            tileItems[i].addStyleClass("showborder-tile-item");
          }

          var kpiName = '',
            className = '';
          var colorCode = 3;
          var tilePerComp = tileItems[i].getContent()[0].getItems()[1].
          getItems()[1].getItems();
          for (var j = 0; j < tilePerComp.length; j++) {
            kpiName = tilePerComp[j].getContent()[0].getText().split(':')[0];
            if (this._tileColors[this._sCategory][kpiName] !== undefined) {
              colorCode = parseInt(this._tileColors[this._sCategory][kpiName]);
              switch (colorCode) {
              case 0:
                className = "tile-kpi-value-red";
                break;
              case 1:
                className = "tile-kpi-value-yellow";
                break;
              case 2:
                className = "tile-kpi-value-green";
                break;
              }
              tilePerComp[j].getContent()[1].addStyleClass(className);
            }
          }

        }
        this.highlightOneTile(this.c1);

      },

      /**
       * getTileColor request backend for the color of kpi values
       */
      getTileColor: function () {
        var tileVBox = this.getView().byId("TileVBox");
        var that = this;
        var kpiName = '';

        var kpiColorDataHandler = function (oData) {

          for (var i = 0; i < oData.length; i++) {
            kpiName = that.oBundle.getText(oData[i].KPI_NAME);
            that._tileColors[that._sCategory][kpiName] = oData[i].RYG;
          }

          that.tileValueFormatter(that, that._tileColors[that._sCategory]);
          $('.v-clippath').remove();
        };


        if (this._tileColors[this._sCategory] === undefined) {
          this._tileColors[this._sCategory] = [];
          var kpiColorReqURL = PROXY.XsjsProxy(this._column1ColorService);
          kpiColorReqURL +=
            "?Component=QUALITY" +
            "&Datef=" + this._tileStartDate +
            "&Datet=" + this._tileEndDate +
            "&KType=" + this._sCategory;


          this.ajaxGet(kpiColorReqURL, tileVBox, kpiColorDataHandler);

        }


      },

      /**
       * Charts in Column2
       * 第二列的图集，滚动组图
       * @param {[chart]} oChart - kpi chart
       */
      setColumn2ChartModel: function (oChart) {
        var that = this;

        if (!this.isValidPeriod(oChart.KPI, this._globalPeriod)) {
          oChart.getModel().setData('');
          that.loaded++;
          that.isFullLoaded();
          return;
        }
        oChart.getKPIChart().setBusy(true);

        var kpiName = oChart.KPI;

        kpiName = jQuery.sap.encodeURL(kpiName);
        var oFilter = "?KPI=" + kpiName + "&KType=" + this._sCategory +
          "&Prd=" + this._globalPeriod + "&Datef=" + this._globalStartDate +
          "&Datet=" + this._globalEndDate;

        var reqURL = PROXY.XsjsProxy(this._column2Service);
        reqURL += oFilter;


        var dataHandler = function (oData, oChart) {

          //oData = [{P_VALUE:99.325,C_VALUE:0,T_VALUE:99,UNIT:'%',PERIOD:'2014-01'},{P_VALUE:99.431,C_VALUE:99.387,T_VALUE:99,UNIT:'%',PERIOD:'2014-02'},{P_VALUE:99.302,C_VALUE:99.349,T_VALUE:99,UNIT:'%',PERIOD:'2014-03'},{P_VALUE:99.29,C_VALUE:99.332,T_VALUE:99,UNIT:'%',PERIOD:'2014-04'},{P_VALUE:99.259,C_VALUE:99.315,T_VALUE:99,UNIT:'%',PERIOD:'2014-05'},{P_VALUE:99.347,C_VALUE:99.321,T_VALUE:99,UNIT:'%',PERIOD:'2014-06'},{P_VALUE:99.238,C_VALUE:99.308,T_VALUE:99,UNIT:'%',PERIOD:'2014-07'},{P_VALUE:99.235,C_VALUE:99.297,T_VALUE:99,UNIT:'%',PERIOD:'2014-08'},{P_VALUE:99.187,C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-09'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-10'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-11'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2014-12'},{P_VALUE:'',C_VALUE:99.289,T_VALUE:99,UNIT:'%',PERIOD:'2015-01'}];   

          oChart.getModel().setData(oData);

          //set unit
          var unit = "";
          var frag = oChart.getParent().getParent().getParent();
          if (oData !== undefined && oData[0] !== undefined && oData[0].UNIT !== undefined) {
            unit = oData[0].UNIT === "PCS" ? that.oBundle.getText("PCS_Q") : oData[0].UNIT;
            oChart.setUnit(unit);
            unit = that.oBundle.getText("UNIT") + ": " + unit;

            frag.getRows()[1].getCells()[0].getContent()[0].setText(unit);
          }

          setTimeout(function () {
            oChart.getKPIChart().getDataset().updateData();
          }, 10);
          
          //Set first legend for dimension chart
          that.setDimChartLegend();
          
          CHART_HELPER.adjustChartYAxis(oChart.getKPIChart());
          //          CHART_HELPER.adjustChartPeriod(that._globalPeriod,that._globalStartDate,that._globalEndDate,oChart.getKPIChart());
          oChart.getKPIChart().setBusy(false);

          that.loaded++;
          that.isFullLoaded();
          $('.v-clippath').remove();
        };

        this.ajaxGet(reqURL, oChart, dataHandler);
        
      },


      /**
       * Charts in Column3
       * @param {[chart]} oChart - dimension chart
       */
      setColumn3ChartModel: function (oChart) {
        var that = this;
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        var orgDimModel = kpiChart.dimModels[this.selectedDim];

        var curDimNames = this._kpiCharts[this.c1][this.c2]
          .dimNames[this._sCategory];
        if (curDimNames === undefined) {
          return;
        }
        var curDim = curDimNames[this.selectedDim];

        var kpiName = this._kpiNames[this._sCategory][this.c1][this
          .c2
        ];
        oChart.getModel().setData('');

        if (!this.isValidPeriod(kpiName, this._globalPeriod)) {
          oChart.getModel().setData('');
          this.loaded++;
          this.isFullLoaded();
          return;
        }

        var dataHandler = function (oData, oChart) {

          kpiChart.dimModels[that.selectedDim] = that.deepClone(oData);

          //Delete the empty data
          var cnt=0;
          var tmp = "";
          for(cnt;cnt<oData.length;cnt++){
        	  if(oData[cnt].DIMENSION !== "空" || (oData[cnt].DIMENSION === "空" && oData[cnt].KPI_VALUE !== "")){
        		  tmp = oData[cnt].DIMENSION;
        		  break;
        	  }
          }
          cnt=0;
          if(tmp !== ""){
        	  for(cnt;cnt<oData.length;cnt++){
            	  if(oData[cnt].DIMENSION === "空" &&  oData[cnt].KPI_VALUE === ""){
            		  oData[cnt].DIMENSION = tmp;
            	  }
              }  
          }
          
          //Set Data model of dimension chart
          that.setDimChartModel(oChart, oData);

          //Set Data model of defect chart
          that.setDefectModel(that._curDefectChart, oData);
          
          //Set first legend for dimension chart
          that.setDimChartLegend();
          
          //Set unit for dimension chart
          //that.setDimChartUnit(oChart);

          /*oChart.setBusy(false);
          that._curDefectChart.setBusy(false);*/

          //Adjust chart x,y axis;
          //          CHART_HELPER.adjustChartPeriod(that._globalPeriod, that._globalStartDate,
          //            that._globalEndDate, oChart, "DIMENSION");
          CHART_HELPER.adjustChartYAxis(oChart);

          that.loaded++;
          that.isFullLoaded();
          setTimeout(function () {
            $('.v-clippath').remove();
          }, 50);
        };

        if (this._selectedDims[this.selectedDim] === undefined) {
          this._selectedDims[this.selectedDim] = [];
        }


        if (orgDimModel === undefined) {
          oChart.setBusy(true);
          this._curDefectChart.setBusy(true);

          var oFilter =
            "?Dimension=" + curDim + "&KPI=" + kpiName + "&Filter=" + this._sqlFilter +
            "&Datef=" + this._globalStartDate + "&Datet=" + this._globalEndDate +
            "&Prd=" + this._globalPeriod + "&KType=" + this._sCategory;
          sap.boDimension = sap.oBundle.getText(curDim);

          var reqURL = PROXY.XsjsProxy(this._column3Service) + oFilter;
          this.ajaxGet(reqURL, oChart, dataHandler);

        } else {

          //Set Data model of dimension chart
          this.setDimChartModel(oChart, orgDimModel);

          //Set unit for dimension chart
          this.setDimChartUnit(oChart);

          //Set Data model of defect chart
          this.setDefectModel(this._curDefectChart, orgDimModel);
          //Adjust chart x,y axis;
          //          CHART_HELPER.adjustChartPeriod(that._globalPeriod, that._globalStartDate,
          //            that._globalEndDate, oChart, "DIMENSION");
          CHART_HELPER.adjustChartYAxis(oChart);
          setTimeout(function () {
            $('.v-clippath').remove();
          }, 50);
        }
        $('.v-clippath').remove();
      },
      
    //Load chart legend value according to choose period on page 00315717herry
      setDimChartLegend: function () {
        //var oData = oChart.getModel().oData;
        if (this._globalPeriod==='YEAR'){
            this._globalPeriodLegend='CurrentYearValue';
        } else if (this._globalPeriod==='Quartor'){
            this._globalPeriodLegend='CurrentQuartorValue';
        } else if (this._globalPeriod==='WEEK'){
            this._globalPeriodLegend='CurrentWeekValue';
        } else if (this._globalPeriod==='DAY'){
            this._globalPeriodLegend='CurrentDayValue';
        } else {
            this._globalPeriodLegend='ActualValue';
        } 
        var Legendname = this.oBundle.getText(this._globalPeriodLegend);
        //if (oData !== undefined ) {
            $("#__xmlview0--Column2ChartVBox .v-row[class*='ID_0'] text").text(Legendname);  
        //}

      },
      
      //Load chart unit on page
      setDimChartUnit: function (oChart) {
        var oData = oChart.getModel().oData;
        if (oData !== undefined && oData[0].UNIT !== undefined) {
          var unit = oData[0].UNIT === "PCS" ? this.oBundle.getText(oData[0].UNIT + "_Q") : oData[0].UNIT;
          unit = this.oBundle.getText("UNIT") + ": " + unit;
          var frag = oChart.getParent().getParent();
          frag.getItems()[0].setText(unit);
        }

      },

      //Build and set data model for dimension chart
      setDimChartModel: function (oChart, oData) {
        //build model for dimension drop-down list;

        this._dimOrgValues[this.selectedDim] = [];

        var dimValues = [];
        var dimList = [];
        for (var i = 0; i < oData.length; i++) {
          if (oData[i].KPI_TAG != "0") continue;
          if (dimValues.indexOf(oData[i].DIMENSION) < 0) {
            dimValues.push(oData[i].DIMENSION);
            dimList.push({
              DIMENSION: oData[i].DIMENSION
            });
          }
        }

        this._dimOrgValues[this.selectedDim] = dimList;

        var orgData = this.deepClone(oData);
        var results = this.generateDimModel(orgData,
          this._selectedDims[this.selectedDim]);
        oChart.getModel().setData(results);

      },

      //TODO
      //TODO
      //TODO
      //Filter dimension data based on selected dimensions
      //z00315717   keep the automatic completed data period  
      generateDimModel: function (jsonData, dimValues) {
        if (jsonData[0] === undefined || dimValues === undefined) return
        jsonData;
      //Delete the empty data
        var cnt=0;
        var tmp = "";
        for(cnt;cnt<jsonData.length;cnt++){
      	  if(jsonData[cnt].DIMENSION !== "空" || (jsonData[cnt].DIMENSION === "空" && jsonData[cnt].KPI_VALUE !== "")){
      		  tmp = jsonData[cnt].DIMENSION;
      		  break;
      	  }
        }
        cnt=0;
        if(tmp !== ""){
      	  for(cnt;cnt<jsonData.length;cnt++){
          	  if(jsonData[cnt].DIMENSION === "空" &&  jsonData[cnt].KPI_VALUE === ""){
          		jsonData[cnt].DIMENSION = tmp;
          	  }
            }  
        }
        /**
         * KPI_TAG
         * 0 DImension
         * 1 Defect Type Detail
         * 2 Defect Reason Detail
         */
        for (var i = 0; i < jsonData.length; i++) {
          if (jsonData[i].KPI_TAG !== "0" && jsonData[i].KPI_TAG !== "") {
            jsonData.splice(i, 1);
            i--;
          } else if (dimValues.length > 0 && dimValues.indexOf(jsonData[i].DIMENSION) <
            //else if (dimValues.length > 0 && dimValues.indexOf(jsonData[i].DIMENSION) <

            0) {
        	  if (jsonData[i].DIMENSION !== "空") { //z00315717
        	  jsonData.splice(i, 1);
              i--;
            }
        	  else if(jsonData[i].DIMENSION  === "空" && jsonData[i].KPI_VALUE !==""){
        	  jsonData.splice(i, 1);
              i--;
        	 }
        	  else if(jsonData[i].DIMENSION  === "空" && jsonData[i].KPI_VALUE ===""){
        		  jsonData[i].DIMENSION = dimValues[0];
                  i--;
            }
          }
        }
        return jsonData;
      },

      //Build and set data model for defect charts
      setDefectModel: function (oChart, oData) {
        var kpiName = this._kpiNames[this._sCategory][this.c1][this.c2];

        if (!this.isValidPeriod(kpiName, this._globalPeriod)) {
          oChart.getModel().setData('');
          return;
        }

        var orgData = this.deepClone(oData);
        var results =
          this.generateDefectModel(
            orgData,
            this._selectedDims[this.selectedDim],
            this._defectIndex);

        var defectModel = oChart.getModel();
        defectModel.setData(results);

        oChart.setModel(defectModel);
      },


      generateDefectModel: function (jsonData, dimValues, defectIndex) {

        if (jsonData[0] === undefined || dimValues === undefined) {
          return jsonData;
        }

        var pos = [];
        var defects = ["1", "2"];
        var index = 0;

        var defectData = jsonData.filter(function (obj) {
          if (obj.KPI_TAG === defects[defectIndex])
            return true;
          else
            return false;
        });

        if (dimValues.length !== 0) {
          defectData = defectData.filter(function (obj) {
            if (jQuery.inArray(obj.DIMENSION, dimValues) > -1)
              return true;
            else
              return false;
          });
        }


        for (var i = 0; i < defectData.length; i++) {
          if (pos[defectData[i].DEFECT] === undefined) {
            pos[defectData[i].DEFECT] = i;
            continue;
          }

          index = pos[defectData[i].DEFECT];
          defectData[index].KPI_VALUE = parseInt(defectData[index].KPI_VALUE) +
            parseInt(defectData[i].KPI_VALUE);
          defectData.splice(i, 1);
          i--;
          continue;

        }

        defectData.sort(function (obj1, obj2) {
          return parseInt(obj2.KPI_VALUE) - parseInt(obj1.KPI_VALUE);
        });


        for (var j = 0; j < defectData.length; j++) {
          if (j - 1 < 0)
            defectData[j].BOLA_VALUE = parseInt(defectData[j].KPI_VALUE);
          else
            defectData[j].BOLA_VALUE = defectData[j - 1].BOLA_VALUE +
            parseInt(defectData[j].KPI_VALUE);
        }
        for (var m = 0; m < defectData.length; m++) {

          defectData[m].BOLA_VALUE = (defectData[m].BOLA_VALUE / defectData[
            defectData.length - 1].BOLA_VALUE)
            .toFixed(4).slice(0, 4) * 100;
        }
        return defectData;

      },

      /*******************************************************************
       * *****Generate Charts
       ******************************************************************/

      /**
       * Generate all tiles and charts on Quality Page
       */
      drawPage: function () {
        this.loadTileBoxes();
        this.drawCharts();
      },


      /**
       * Generate tile boxes on column1
       */
      loadTileBoxes: function () {

        //clear charts info of ex-category
        this.c1 = 0;
        this.c2 = 0;
        this._kpiCharts = [];
        this.getTileData();
        this.getTileColor();

      },

      /**
       * Generate charts on column 2 and 3
       */
      drawCharts: function () {
        //the number of kpi charts that have been loaded
        this.loaded = 0;

        this.drawColumn2Charts();
        this.drawColumn3Charts();
        $('.v-clippath').remove();
      },

      /**
       * Generate charts on column 2 when click corresponding tile
       */
      drawColumn2Charts: function () {
        // remove existing charts and mapping info of column2,3

        //HERE HERE HERE
        var selectedTile = this.c1;

        //whether the charts for this tile have been created
        if (this._kpiCharts[selectedTile] === undefined || this._kpiCharts[
          selectedTile].length === 0) {
          this._kpiCharts[selectedTile] = [];

          // Get the kpi names of selected category - subcomponent;
          var kpiTitles = this._kpiNames[this._sCategory][selectedTile];

          // Generate KPI Charts on column 2
          for (var i = 0; i < kpiTitles.length; i++) {
            //judge if the chart has been created
            if (this._kpiCharts[selectedTile][i] === undefined) {
              var kpiChart = new huawei.cmes.control.charts.KPIChart({
                title: kpiTitles[i],
                category: this._sCategory,
                period: this._globalPeriod
              });
              kpiChart.getKPIChart().attachBrowserEvent("click", this.onKPISelect,
                this);
              var oModel = new sap.ui.model.json.JSONModel();
              kpiChart.setModel(oModel);

              this._kpiCharts[selectedTile][i] = kpiChart;
              this.setColumn2ChartModel(this._kpiCharts[selectedTile][i]);

            }
          }

        } else {
          this.loaded = this._kpiCharts[selectedTile].length;
        }

        this.loadColumn2Carousel();
      },

      /**
       * Create sub-dimension and defect charts on column 3
       */
      drawColumn3Charts: function () {
        // remove existing charts and mapping info of column 3 
        this._dimCharts = [];
        this._curDefectChart = null;

        //data values for dimension drop-down list
        this._dimOrgValues = [];

        //selected dimensions
        this._selectedDims = [];

        //selected tab of dimensions charts on column 3 
        this.selectedDim = 0;

        //selected defect tab on column 3 
        this._defectIndex = 0;

        // Create chart tab on bottom of column 3 for defects charts
        this.drawDefectChartTabBar();
        // default chart type is pie chart
        this._curDefectChart = this.drawDefectChart("pie");

        // Create chart tab on top of column 3 for sub-dimension charts
        this.drawDimTabBar();

        this.setColumn3ChartModel(this.drawDimCharts());
      },

      /**
       * Create chart tab for sub-dimension charts
       */
      drawDimTabBar: function () {
        var oChartContainer = this.getView().byId("Column3ChartContainer1");
        oChartContainer.removeAllItems();

        var curKPIChart = this._kpiCharts[this.c1][this.c2];
        var curKPI = curKPIChart.KPI;

        var dimensions = curKPIChart.dimNames[this._sCategory];
        if (dimensions === undefined) {
          return;
        }

        for (var i = 0; i < dimensions.length; i++) {
          var id = curKPI + "_" + i;
          var tab = sap.ui.getCore().byId(id);
          if (tab === undefined) {
            tab = new sap.m.IconTabFilter(id, {
              key: id,
              text: this.oBundle.getText(dimensions[i]),
            });
          } else {
            tab.removeAllContent();
          }

          oChartContainer.addItem(tab);
        }

        // Select the first tab as default
        this.getView().byId("Column3ChartContainer1").setSelectedKey(curKPI +
          "_" + 0);

      },

      /**
       * Create dimension charts on column 3
       *
       * @returns dimension chart
       */
      drawDimCharts: function () {

        var selectedTab = this.selectedDim;
        var selectedKPIChart = this._kpiCharts[this.c1][this.c2];

        if (selectedKPIChart.dimCharts[selectedTab] === undefined) {
          this._dimCharts[selectedTab] = selectedKPIChart
            .getSubDimChart(selectedTab);
        } else {
          this._dimCharts[selectedTab] = selectedKPIChart.dimCharts[
            selectedTab];
        }

        var dimChartContainer = this.getView()
          .byId("Column3ChartContainer1");

        // load dimenstion chart onto page
        var dimChartFrag = this
          .loadDimFragment(this._dimCharts[selectedTab]);
        var displayTab = dimChartContainer.getItems()[selectedTab];
        if (displayTab !== undefined) {
          displayTab.removeAllContent();
          displayTab.addContent(dimChartFrag);
          dimChartContainer.setSelectedKey(selectedTab);
        }
        //add try catch due to there is no selectedKPIChart.dimNames[0][0],it would occur: "Cannot read property '0' of undefined"
        try {
        sap.dimSelect=selectedKPIChart.dimNames[0][selectedTab]; 
        } catch (e) {
            console.log(e);
        }
        return this._dimCharts[selectedTab];
      },

      /**
       * Create tab bar for defect charts
       */
      drawDefectChartTabBar: function () {
        var oChartContainer = this.getView().byId("Column3ChartContainer2");
        // clear tab bar of defect charts
        oChartContainer.removeAllItems();

        for (var i = 0; i < this._defectTypes.length; i++) {
          var id = "defectTab_" + i;
          var tab = sap.ui.getCore().byId(id);
          if (tab === undefined) {
            tab = new sap.m.IconTabFilter(id, {
              key: i,
              text: this.oBundle.getText(this._defectTypes[i])
            });
          } else {
            tab.removeAllContent();
          }
          oChartContainer.addItem(tab);
        }
      },

      /**
       *
       * @param chartType
       *          pie, plato, bar - default 'pie'
       * @returns
       */
      drawDefectChart: function (chartType) {

        var oDefectChartsContainer = this.getView().byId(
          "Column3ChartContainer2");
        var defectTab = oDefectChartsContainer.getItems()[this._defectIndex];
        if (defectTab === undefined) { //failed to create icon bar for defect chart
          return null;
        }
        var oChart = this.getDefectChart(true, chartType);
        //load onto page
        defectTab.removeAllContent();
        defectTab.addContent(this.loadDefectFragment(oChart));

        oDefectChartsContainer.setSelectedKey(this._defectIndex);

        this._defectReload = false;
        sap.ui.getCore().byId(chartType).setSelected(true);

        return oChart;
      },


      displayDefectCharts: function () {

        var displayDefect = huawei.cmes.quality.setting.Config.defectKPIs;
        var curKPI = this._kpiNames[this._sCategory][this.c1][this.c2];
        if (displayDefect.indexOf(curKPI) < 0) {
          sap.ui.getCore().byId("__xmlview0--Column3ChartContainer2").setVisible(
            false);
        } else {
          sap.ui.getCore().byId("__xmlview0--Column3ChartContainer2").setVisible(
            true);
          this._dimCharts[this.selectedDim].setHeight('280px');
        }
      },

      getDefectChart: function (isNew, chartType) {
        if (isNew) {
          return this._kpiCharts[this.c1][this.c2]
            .getDefectChart(this._defectIndex, chartType);
        } else {
          return this.getView().byId("Column3ChartContainer2").getItems()[
              this._defectIndex]
            .getContent()[0].getRows()[1].getCells()[0].getContent()[1];
        }
      },
      /*******************************************************************
       * *****Utilities
       ******************************************************************/

      /**
       * If all charts have been loaded completely, enable category switch button
       */
      isFullLoaded: function () {
        var kpiChartsNo = this._kpiNames[this._sCategory][this.c1]
          .length;
        var allCharts = kpiChartsNo + 1;
        if (this.loaded >= allCharts) {
          sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(true);
        } else {
          sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(false);
        }

        if (this.loaded > kpiChartsNo) {
          this._dimCharts[this.selectedDim].setBusy(false);
          this.setDimChartUnit(this._dimCharts[this.selectedDim]);
          this._curDefectChart.setBusy(false);
        }
      },


      /**
       * High light one tile box
       *
       * @param tileIndex
       */
      highlightOneTile: function (tileIndex) {
        var tileBoxes = this.getView().byId("tile-list").getItems();
        if (tileBoxes.length === undefined || tileBoxes.length === 0) return;

        for (var i = 0; i < tileBoxes.length; i++) {
          tileBoxes[i].addStyleClass("tileBox-gray");
          tileBoxes[i].getContent()[0].getItems()[1].getItems()[0].removeStyleClass(
            "tileBox-highlight");
        }

        tileBoxes[tileIndex].removeStyleClass("tileBox-gray");
        tileBoxes[tileIndex].getContent()[0].getItems()[1].getItems()[0].addStyleClass(
          "tileBox-highlight");
      },

      /**
       * highlightKPIChart highlight selected kpi char
       * @param  {Integer} kpiIndex [the index of kpi chart that need to be hightlight]
       */
      highlightKPIChart: function (kpiIndex) {
        var tileIndex = this.c1;

        var kpiFrag = null;
        for (var j = 0; j < this._kpiCharts[tileIndex].length; j++) {
          kpiFrag = this._kpiCharts[tileIndex][j].getParent().getParent()
            .getParent();
          kpiFrag.addStyleClass("tileBox-gray");
        }

        kpiFrag = this._kpiCharts[tileIndex][kpiIndex].getParent().getParent()
          .getParent();
        kpiFrag.removeStyleClass("tileBox-gray");
        $('.v-clippath').remove();
      },

      /**
       * Formatter for tile data on column 1
       */
      tileValueFormatter: function (oThat, kpiColors) {
        var that = oThat;

        var tileList = that.getView().byId("tile-list").getItems();
        var tileItems = [];
        var className = "";
        for (var i = 0; i < tileList.length; i++) {
          tileItems = tileList[i].getContent()[0].getItems()[1]
            .getItems()[1].getItems();
          for (var j = 0; j < tileItems.length; j++) {
            if (tileItems[j] !== undefined) {
              var kpiName = tileItems[j].getContent()[0].getProperty("text")
                .split(":")[0];
              var colorCode = parseInt(kpiColors[kpiName]);

              switch (colorCode) {
              case 0:
                className = "tile-kpi-value-red";
                break;
              case 1:
                className = "tile-kpi-value-yellow";
                break;
              case 2:
                className = "tile-kpi-value-green";
                break;
              }
              tileItems[j].getContent()[1].addStyleClass(className);
            }
          }
        }
      },


      /*******************************************************************
       * *****Load to page
       ******************************************************************/
      /*
       */
      /**
       * Load tile fragment
       *
       * @param boxIndex
       * @param oData
       */

      loadDefectFragment: function (oChart) {
        var oFragment = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.SubDefectChart", this);
        oFragment.getRows()[1].getCells()[0].addContent(oChart);
        oFragment.getRows()[0].getCells()[0].getContent()[0].setText(oChart.getTitle()
          .getText());

        return oFragment;

      },

      /**
       * loadDiffTypeChart replace current defect chart by the selected type of char
       * @param  {String} chartType [the type of defect chart: pie, dual, bar]
       */
      loadDiffTypeChart: function (chartType) {
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        var orgData = this.deepClone(kpiChart.dimModels[this.selectedDim]);

        //get a new defect chart form kpi chart 
        this._curDefectChart = this.getDefectChart(true, chartType);
        this.setDefectModel(this._curDefectChart, orgData);

        if (this.getDefectChart(false, '') !== undefined) {
          //Get the position of current defect chart
          var chartLoc = this.getDefectChart(false, '').getParent();
          chartLoc.removeContent(1);
          //replace the original defect chart with the new one
          chartLoc.addContent(this._curDefectChart);
        }
      },

      /**
       * loadSub1Fragment load kpi chart control into the fragment for charts on column
       * @param  {huawei.cmes.control.charts.KPIChart} oChart [the kpi chart control]
       */
      loadSub1Fragment: function (oChart) {

        var oFragment = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.Sub1Chart", this);
        var unit = '',
          title = '';
        if (oChart.getUnit() !== undefined) {
          unit = this.oBundle.getText("UNIT") + ": " + oChart.getUnit();
          oFragment.getRows()[1].getCells()[0].getContent()[0].setText(unit);
        }
        title = oChart.TITLE;
        oFragment.getRows()[0].getCells()[0].getContent()[0].setText(title);

        oFragment.getRows()[1].getCells()[0].addContent(oChart);

        return oFragment;
      },

      /**
       * loadColumn2Carousel load all fragments for charts on column2 into carousel or pane
       */
      loadColumn2Carousel: function () {
        var oChartContainer = this.getView().byId("Column2ChartVBox");

        if (this._kpiCharts[this.c1] === undefined) return;
        var _iChartcount = this._kpiCharts[this.c1].length;
        var frag = null;
        var chart = null;

        var minSize = this.sPagesize;
        var contentHight = document.body.scrollHeight - 60;
        var size = Math.floor((contentHight - 50) / 270);
        size = size >= minSize ? size : minSize;
        var crsHight = 80 + size * 270 + "px";

        var oPanel = null;
        var i = 0;

        if (_iChartcount <= size) {
          oPanel = new sap.ui.commons.Panel({
            width: "100%"
          });
          var chartNo = this._kpiCharts[this.c1].length;

          for (i = 0; i < chartNo; i++) {
            chart = this._kpiCharts[this.c1][i];
            frag = this.loadSub1Fragment(chart);
            oPanel.addContent(frag);
          }
          oChartContainer.removeAllItems();
          oChartContainer.addItem(oPanel);
          oChartContainer.addStyleClass("sub1chart-box_panel");

        } else {
          var oCarousel = new sap.ui.commons.Carousel({
            width: "100%",
            //            height: crsHight
          }).addStyleClass('kpi-chart-carousel');
          oChartContainer.removeStyleClass("sub1chart-box_panel");
          oCarousel.setOrientation("vertical");
          oCarousel.setVisibleItems(1);

          var _oPanels = {};
          var _iPagecount = Math.ceil(_iChartcount / size);

          for (var j = 0; j < _iPagecount; j++) {
            oPanel = new sap.ui.commons.Panel({
              // height:crsHight 
            });
            var n = j * size;
            for (i = 0; i < size; i++) {
              if (n + i >= this._kpiCharts[this.c1].length) {
                break;
              }
              chart = this._kpiCharts[this.c1][n + i];
              frag = this.loadSub1Fragment(chart);
              oPanel.addContent(frag);
              _oPanels[j] = oPanel;
            }
            oCarousel.addContent(_oPanels[j]);
            oChartContainer.removeAllItems();
            oChartContainer.addItem(oCarousel);
          }
        }
        $('.v-clippath').remove();
        this.highlightKPIChart(this.c2);
      },

      /**
       * loadDimFragment load defect chart control to the fragments for defect chart
       * @param  {huawei.cmes.control.charts.KPIChart} oChart [the defect chart control]
       */
      loadDimFragment: function (oChart) {
        var oFragment = sap.ui.xmlfragment(
          "huawei.cmes.fragment.quality.Sub2Chart", this);
        oFragment.getItems()[1].addItem(oChart);
        return oFragment;
      },


      /**
       * Load charts onto popover dialog
       * @param boxIndex
       * @param oData
       */
      loadChartPopover: function (oTitle, oChart) {

        this._chartDlg.removeAllContent();
        sap.ui.getCore().byId('chart-dlg-title').setText('');

        oChart.addStyleClass('popover-chart');
        this._chartDlg.addContent(oChart);
        sap.ui.getCore().byId('chart-dlg-title').setText(oTitle);
        this._chartDlg.open();
        $('.v-clippath').remove();
      },



      /*******************************************************************
       * *****Event Handling
       ******************************************************************/

      /**
       * handle the switch event of global category
       *
       * @param oEvent
       */
      handleCategoryPress: function (oEvent) {
        this.loaded = 0;
        //clear the data filter
        if (this._oFilterDlg !== undefined) {
          this._oFilterDlg._oFilter.setCurKPI('');
        }
        this._sqlFilter = "";
        this.adjustTileIconShown();

        sap.ui.getCore().byId('__xmlview0--CategorydecriptionSWT').setEnabled(
          false);
        if (!oEvent.getParameter("state")){
            this._sCategory = 0;
            sap.category = this._sCategory;
        }
        else{
        	this._sCategory = 1;
            sap.category = this._sCategory;
        }
        if (this._kpiNames[this._sCategory] === undefined) {
          this.initPage();
        } else {
          this.drawPage();
        }
      },

      /**
       * handle the press event of tile boxes on column 1
       *
       * @param oEvent
       */
      onTileSelect: function (oEvent) {
        //Find ALl Charts and Reset the legend select History
        $('.sapVizChart').each(function (index, item) {
          var chartId = item.id;
          //Set the select history to undefined
          if (sap.chartSelect !== undefined) {
            sap.chartSelect[chartId] = undefined;
          }
        });

        var selectedItem = oEvent.getParameter("listItem");
        var tileList = this.getView().byId("tile-list");
        var index = tileList.indexOfItem(selectedItem);

        this.highlightOneTile(index);

        this.c1 = index;
        this.c2 = 0;
        this._sqlFilter = '';

        this.drawCharts();
        $('.v-clippath').remove();
      },

      /**
       * handle the click event on KPI chart (Column 2 Charts)
       *
       * @param oEvent
       */
      onKPISelect: function (oEvent) {
        // console.log("onKPISelect");
        if (this._sqlFilter !== '') {
          this.clearDimData();
        }

        this._sqlFilter = "";
        var kpiChart = sap.ui.getCore().byId(oEvent.currentTarget.id);
        var sKPI = kpiChart.getParent().KPI;
        sap.kpiSelected = sKPI;
        var index = 0,
          kpiNames =
          this._kpiNames[this._sCategory][this.c1];
        for (var i = 0; i < kpiNames.length; i++) {
          if (kpiNames[i] === sKPI) {
            index = i;
            break;
          }
        }

        /*if (index === this.c2) {
          return;
        }*/

        this.c2 = index;
        this.drawColumn3Charts();

        this.highlightKPIChart(this.c2);
      },

      //Popover handlers
      /**
       * handle the click event on popover button of KPI chart (Column 2 Charts)
       *
       * @param oEvent
       */
      onKPIChartPopover: function (oEvent) {

        var selectedChart = oEvent.oSource.getParent().getParent().getParent()
          .getRows()[1].getCells()[0].getContent()[1];

        var kpiCharts = this._kpiCharts[this.c1];
        var popUpChart = null;
        for (var i = 0; i < kpiCharts.length; i++) {
          if (kpiCharts[i].KPI === selectedChart.KPI) {
            popUpChart = kpiCharts[i].clone();
            break;
          }
        }
        if (popUpChart === null) {
          return;
        }
        /*var kpiChart = this._kpiCharts[this.c1][this.c2].clone();*/
        CHART_HELPER.adjustChartYAxis(popUpChart.getKPIChart());

        popUpChart.getKPIChart().addStyleClass('popover-chart');
        this.loadChartPopover(popUpChart.TITLE, popUpChart);
      },

      /**
       * handle the click event on popover button of Dimension chart
       * (charts on the top of column 3)
       *
       * @param oEvent
       */
      onDimChartPopover: function (oEvent) {

        var sTitle = this._kpiCharts[this.c1][this.c2].KPI;
        var dName = this._kpiCharts[this.c1][this.c2]
          .dimNames[this._sCategory][this.selectedDim];

        var kpiChart = this._kpiCharts[this.c1][this.c2].getSubDimChart(this.selectedDim);

        var oModel = this._dimCharts[this.selectedDim].getModel();
        kpiChart.setModel(oModel);

        CHART_HELPER.adjustChartYAxis(kpiChart);
        //        CHART_HELPER.adjustChartPeriod(this._globalPeriod, this._globalStartDate,
        //          this._globalEndDate, kpiChart, "DIMENSION");

        sTitle = this.oBundle.getText(sTitle) + " by " + this.oBundle.getText(
          dName);
        this.loadChartPopover(sTitle, kpiChart);
      },

      /**
       * handle the click event on popover button of Defect chart
       * (charts on the bottom of column 3)
       *
       * @param oEvent
       */
      onDefectChartPopover: function (oEvent) {

        var dChart = this._curDefectChart.clone();
        var sTitle = this._defectTypes[this._defectIndex];
        sTitle = this.oBundle.getText(sTitle);
        this.loadChartPopover(sTitle, dChart);
      },

      /**
       * [onDimensionTabSelect description]
       * @param  {oEvent} oEvent [handle click event of icon bar on column 3]
       */
      onDimensionTabSelect: function (oEvent) {
        //Reset All Select History of all points on dimension chart
        $('.quality-dimension-chart').each(function (index, item) {
          var chartId = item.id;
          //This will trigger another funcion {onDeSelectRerender} in util/chart/Helper
          if (sap.chartSelect !== undefined) {
            sap.chartSelect[chartId] = undefined;
          }
        });

        //Set BO dimension name
        sap.boDimension = oEvent.getParameters().item.getText();
        //Container for defect charts
        var oDefectChartsContainer = this.getView().byId(
          "Column3ChartContainer2");
        var defectTab = null;
        for (var i = 0; i < this._defectTypes.length; i++) {
          defectTab = oDefectChartsContainer.getItems()[i];
          defectTab.removeAllContent();
        }
        this.selectedDim = parseInt(
          oEvent.getParameter("selectedKey").split("_")[1]);
        this._defectIndex = 0;
        //create new defect chart and bind data for newly selected dimension
        this._curDefectChart = this.drawDefectChart("pie");
        this._defectReload = false;
        sap.ui.getCore().byId("pie").setSelected(true);

        this.setColumn3ChartModel(this.drawDimCharts());

      },


      //Dimension DDL handlers
      /**
       * handle the click event on dimension drop-down list on top of column 3
       * @param oEvent
       */
      onDimensionDDLOpen: function (oEvent) {
        var selectedKPIChart = this._kpiCharts[this.c1][this.c2];
        var curDim = selectedKPIChart.dimNames[this._sCategory][this.selectedDim];

        var orgValues = this.deepClone(this._dimOrgValues[this.selectedDim]);

        var dimModel = new sap.ui.model.json.JSONModel();
        //if current dimension is included in the data filter fields
        var dimIndex = this._sqlFilter.indexOf(curDim);
        if (dimIndex > -1) {
          var tmpFilter = this._sqlFilter.substr(dimIndex);
          var endIndex = tmpFilter.indexOf("%29");
          // dataFilter - all selected dimension values in the data filter
          var dataFilter = tmpFilter.substr(dimIndex, endIndex);
          var finalList = [];
          // only the selected dimension values by data filter could be displayed on the drop-down list
          for (var l = 0; l < orgValues.length; l++) {
            var encodeDim = jQuery.sap.encodeURL(orgValues[l].DIMENSION);
            if (dataFilter.indexOf(encodeDim) > -1) {
              finalList.push({
                DIMENSION: orgValues[l].DIMENSION
              });

            }
          }
          dimModel.setData(finalList);
        } else {
          dimModel.setData(orgValues);
        }

        this._dimensionDDL.setModel(dimModel);
        //if selection is empty or are same with dimension values, means all values are selected
        if (this._selectedDims[this.selectedDim].length === 0 ||
          this._selectedDims[this.selectedDim].length === orgValues.length) {
          sap.ui.getCore().byId("ddl-selectAll").setSelected(true);
        } else {
          //else, filter in the selected values get from data filter 
          this._initLoad = true;
          sap.ui.getCore().byId("ddl-selectAll").setSelected(false);
          var ddlItems = sap.ui.getCore().byId("DimensionValueList").getItems();
          //ddlItems - all items of drop-down list
          for (var j = 0; j < ddlItems.length; j++) {
            //this._selectedDims[this.selectedDim] - selected values of current selected dimension
            for (var i = 0; i < this._selectedDims[this.selectedDim].length; i++)
              if (this._selectedDims[this.selectedDim][i] === ddlItems[j].getProperty(
                "title")) {
                ddlItems[j].setSelected(true);
              }
          }
        }

        this._dimensionDDL.openBy(oEvent.getSource());
      },

      /**
       * handle the click event on 'OK' button of dimension drop-down list
       * @param oEvent
       */
      onDimensionValueSelect: function (oEvent) {
        this._dimensionDDL.close();

        if (oEvent.getParameter('id') !== 'ddlOK') {
          return;
        }
        //current kpi chart
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        //original model data of current dimension chart
        var orgData = this.deepClone(kpiChart.dimModels[this.selectedDim]);

        var dimensionDDL = sap.ui.getCore().byId("DimensionValueList");

        this._selectedDims[this.selectedDim] = [];
        var selectedItems = dimensionDDL.getSelectedItems();

        for (var i = 0; i < selectedItems.length; i++) {
          this._selectedDims[this.selectedDim].push(selectedItems[i]
            .getProperty("title"));
        }
        //generte and bind data to dimension chart control based on this._selectedDims
        this.setColumn3ChartModel(this._dimCharts[this.selectedDim]);
        //update the model data of defect chart without creating a new chart
        var curDefectChart = this.getDefectChart(false, '');
        this.setDefectModel(curDefectChart, orgData);
      },


      /**
       * handle the select All event on dimension drop-down list
       * @param oEvent
       */
      onDimDDLSelectAll: function (oEvent) {
        if (this._initLoad) {
          this._initLoad = false;
          return;
        }
        var ddl = sap.ui.getCore().byId("DimensionValueList");
        var selected = sap.ui.getCore().byId("ddl-selectAll").getSelected();
        if (selected) {
          ddl.selectAll();
        } else {
          var items = ddl.getItems();

          for (var i = 0; i < items.length; i++) {
            items[i].setSelected(selected);
          }
        }

      },

      /**
       * handle the select event on dimension drop-down list
       * @param oEvent
       */
      onDimDDLSelectChange: function (oEvent) {
        //dynamically control the check status of item 'select all' on the dimension ddl
        var selected = oEvent.getParameter("selected");
        var selectAll = sap.ui.getCore().byId("ddl-selectAll");
        if (!selected) {
          selectAll.setSelected(false);
        } else {
          var ddl = sap.ui.getCore().byId("DimensionValueList");
          var items = ddl.getItems();
          for (var i = 0; i < items.length; i++) {
            if (!items[i].getSelected()) {
              selectAll.setSelected(false);
              return;
            }
          }
          selectAll.setSelected(true);
        }

      },

      /**
       * handle the select event on chart category ddl
       * @param oEvent
       */
      onDefectChartTypeSelect: function (oEvent) {
        if (!this._defectReload) {
          this._defectReload = true;
          return;
        }
        this._defectChartTypePopover.close();
        var chartType = oEvent.getParameter("id");
        this._defectType = chartType;
        this.loadDiffTypeChart(chartType);
      },


      /**
       * handle the click event on defect tab bar
       * (lower part of column 3)
       * @param oEvent
       */
      onDefectTabSelect: function (oEvent) {
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        var orgData = this.deepClone(kpiChart.dimModels[this.selectedDim]);

        this._defectIndex = oEvent.getParameter("key");

        var chartType = "";
        if (this.getView().byId("Column3ChartContainer2").getItems()[this._defectIndex]
          .getContent()[0] === undefined) {
          this._defectType = "pie"; //if new defect chart loaded, create pie chart as default
          this._curDefectChart = this.drawDefectChart(this._defectType);
          this.setDefectModel(this._curDefectChart, orgData);

          this._defectReload = false; //if set true, the event handler on defect chart type select will be trigger incorrectly
          chartType = this.getDefectType(this._curDefectChart);
          sap.ui.getCore().byId(chartType).setSelected(true);
        } else { //if the defect chart is existed, re-bind data and get the chart type
          this._curDefectChart = this.getDefectChart(false, '');
          this.setDefectModel(this._curDefectChart, orgData); //the search criteria may be changed, need to re-bind the data

          this._defectReload = false; //if set true, when set selected as below, the binded event handler will be triggered unexpectedly
          this._defectType = this._curDefectChart.getVIZChartType().split("/")[
            1]; //get chart type for data binding of chart type list

          chartType = this.getDefectType(this._curDefectChart);
          sap.ui.getCore().byId(chartType).setSelected(true);
        }

      },


      //Data Filter Handlers 
      /**
       * handle the click event on data filter button on top of column 3
       * @param oEvent
       */
      handleFilterPopover: function (oEvent) {
        var that = this;
        if (this._oFilterDlg === undefined) {
          var userId;
          jQuery.ajax({
            url: "userinfojsonns/GetUserInfoAction.action",
            context: this,
            success: function (data) {
              userId = data.session.wId;
            },
            async: false
          });

          this._oFilterDlg = sap.ui.xmlfragment(
            "huawei.cmes.fragment.quality.BuildChartFilter", this);
          this.getView().addDependent(this._oFilterDlg);
        }

        var filterArea = sap.ui.getCore().byId("filterBar");
        //get current kpi name to fetch the dimensions
        var kpi = this._kpiNames[this._sCategory][this.c1][this.c2];
        kpi = jQuery.sap.encodeURL(kpi);
        //if the filter has not been used or the selected kpi is changed, create a new filter
        if ((this._oFilterDlg._oFilter === undefined) || (kpi !== this._oFilterDlg
          ._oFilter.getCurKPI())) {
          var advFilter = new huawei.cmes.control.Filter.MESFilter({
            dateFrom: this._globalStartDate,
            dateTo: this._globalEndDate,
            productCategory: this._sCategory,
            curKPI: kpi,
            width: "100%",
            defaultSpan: "L12 M12 S12",
            vSpacing: 0,
            hSpacing: 0
          });

          var filterModel = new sap.ui.model.json.JSONModel(
            huawei.cmes.util.services.Proxy.XsjsProxy(this._filterDims,
              "?KPI=" +
              kpi + "&KType=" + this._sCategory));

          advFilter.setModel(filterModel);
          //reload the content of data filter dialog
          filterArea.removeAllContent();
          filterArea.addContent(advFilter);
          this._oFilterDlg._oFilter = advFilter;

          filterModel
            .attachRequestCompleted(
              function () {
                that._oFilterDlg._oFilter.initRanges();
              });
        }

        this._oFilterDlg.open();
      },

      /**
       * handle the click event on 'OK' and 'Cancel' button of Data filter dialog
       * @param oEvent
       */
      onFilterDlgClose: function (oEvent) {
        this._oFilterDlg.close();
        if (oEvent.getParameter('id') === 'filter-cancel') {
          return;
        }

        var tmpFilter = this._oFilterDlg._oFilter
          .getFormatedRangeSQLText();
        // console.log(tmpFilter);
        if (tmpFilter.localeCompare(this._sqlFilter) !== 0) {
          this._sqlFilter = tmpFilter;
          //Get the url that BO needs
          sap.boUrl = sap.dimensionFilterCombination
            .replace(/\(|\)|\'/g, '')
            .replace(/\,/g, ';')
            .replace(/ IN /g, '=')
            .replace(/AND /g, '&lsM')
            .replace(/ /g, '');
          this.clearDimData();
          this.setColumn3ChartModel(this.drawDimCharts());
        }

      },

      /**
       * clear loaded data of dimension charts
       */
      clearDimData: function () {
        var kpiChart = this._kpiCharts[this.c1][this.c2];
        kpiChart.dimModels = [];
      },

      /**
       * handle the click event on 'Reset' button of Data filter dialog
       * @param oEvent
       */
      onFilterReset: function () {
        this._oFilterDlg._oFilter.reset();
      },

      //Time Filter Handlers
      ontfCancel: function () {
        var oNavCon = sap.ui.core.Fragment.byId("popoverNav",
          "nav");
        oNavCon.back();
      },

      /**
       * handle the click event on 'Time Selection'
       * @param oEvent
       */
      onTimeFilterOpen: function (oEvent) {
        var that = this;
        /**
         * call this function when calendar button is clicked
         * @param  {String} view id in fragment - 2 calendars in it
         * @param  {String} first calendar sap id
         * @param  {String} second calendar sap id
         * @return {Function} return the functin when the button is click
         */
        var listenerFunc = function (id, calendar1, calendar2) {
          /**
           * Call this function to change the date selection range in canlendar
           * @param  {sap.ui.unified.Calendar} oCalendar
           * @param  {Int} month change - back 2 month---2 | forward 2 month--2
           */
          var dateChange = function (oCalendar, month) {
            var year = 0;
            var focusDate = oCalendar._getFocusedDate(); // the focused range of the calendar
            var tempMonth = new Date(focusDate).getMonth();
            var tempYear = 1900 + new Date(focusDate).getYear();
            var changedDate = new Date();
            if (month > 0) {
              if (tempMonth === 11) {
                month = -11;
                year = 1;
              }
            } else {
              if (tempMonth === 0) {
                month = 11;
                year = -1;
              }
            }
            //get the target month
            changedDate.setFullYear(tempYear + year, tempMonth + month,
              15);

            var backDate = new Date(changedDate);
            //Set the focused date range of the calendar
            oCalendar.focusDate(backDate);
          };
          //Back 1 month
          var dateBack = function (oCalendar) {
            dateChange(oCalendar, -1);
          };
          //Forward 1 month
          var dateForward = function (oCalendar) {
            dateChange(oCalendar, 1);
          };

          return function () {
            //Get the fragment view 1
            var oNavCon = sap.ui.core.Fragment.byId("popoverNav",
              "nav");
            //get the fragment view 2
            var oDetailPage = sap.ui.core.Fragment.byId("popoverNav",
              id);
            //Jump from fragment 1 to fragment view 2 the fragment view is is 'id'
            oNavCon.to(oDetailPage);

            var currentMonthDate, lastMonthDate;
            if (id.indexOf('start') > -1) {
              currentMonthDate = new Date(that._globalStartDate);
              lastMonthDate = new Date(that._globalStartDate);
            } else {
              currentMonthDate = new Date(that._globalEndDate);
              lastMonthDate = new Date(that._globalEndDate);
            }
            HELPER.getLastMonth(lastMonthDate);

            var oCalendar1 = sap.ui.getCore().byId(
              "popoverNav--" + calendar1);
            var oCalendar2 = sap.ui.getCore().byId(
              "popoverNav--" + calendar2);

            oCalendar1.focusDate(lastMonthDate); // set the date range of 1st calendar
            oCalendar2.focusDate(currentMonthDate); // set the date range of 2nd calendar
            //Cancel all click event of the back button
            $("#popoverNav--" + calendar1 + "-prev").off("click");
            //Create a new click even listener of the back button
            $("#popoverNav--" + calendar1 + "-prev").click(function () {
              dateBack(oCalendar2);
            });

            //Cancel all click event of the forward button
            $("#popoverNav--" + calendar2 + "-next").off("click");
            //Create a new click even listener of the forward button
            $("#popoverNav--" + calendar2 + "-next").click(function () {
              dateForward(oCalendar1);
            });

            // remove the forward button of the first calendar
            // remove the back button of the second calendar
            // because the 2 calendars are sharing 1 back button and 1 forward button
            $("#popoverNav--" + calendar1 + "-next").remove();
            $("#popoverNav--" + calendar2 + "-prev").remove();

          };
        };

        /**
         * Start set the listeners of the double calendar control
         */
        var listenerSetting = function () {
          //Call this function when the first datepicker control is clicked
          var startFunc = listenerFunc('detail-start', 'calendar1',
            'calendar2');
          //Call this function when the end datepicker control is clicked
          var endFunc = listenerFunc('detail-end', 'calendar3', 'calendar4');
          //Attach the event
          sap.ui.getCore().byId("popoverNav--tfStart").attachBrowserEvent(
            'click', startFunc);
          //Attach the event
          sap.ui.getCore().byId("popoverNav--tfEnd").attachBrowserEvent(
            'click', endFunc);
        };

        var timeFilter = sap.ui.getCore().byId('popoverNav--timeFilter');
        if (timeFilter !== undefined) {
          this.getView().removeDependent(timeFilter);
          timeFilter.destroy();
        }
        timeFilter = sap.ui.xmlfragment('popoverNav',
          "huawei.cmes.fragment.quality.GlobalTimeFilter", this);
        this.getView().addDependent(timeFilter);
        sap.ui.getCore().byId("popoverNav--tfStart").setValue(HELPER.getDisplayDate(
          this._globalPeriod, this._globalStartDate));
        sap.ui.getCore().byId("popoverNav--tfEnd").setValue(HELPER.getDisplayDate(
          this._globalPeriod, this._globalEndDate));
        sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
          true);

        listenerSetting();

        var oButton = oEvent.getSource();

        jQuery.sap.delayedCall(0, this, function () {
          timeFilter.openBy(oButton);
        });

      },

      handleCalendarSelect: function (oEvent) {
        var oCalendar = oEvent.oSource;
        var date = oCalendar.getSelectedDates()[0].getStartDate();
        date = sap.ui.core.format.DateFormat.getInstance({
          pattern: "yyyy-MM-dd"
        }).format(date);

        var period = (this._tmpPeriod !== null) ? this._tmpPeriod : this._globalPeriod;

        var dispDate = '',
          msg = '';
        var calendarId = oEvent.getParameter('id');
        if (calendarId.indexOf('calendar1') < 0 && calendarId.indexOf('calendar2') < 0) {
          this._tmpEndDate = HELPER.getSearchDate(period, date, false);
          dispDate = HELPER.getDisplayDate(period, this._tmpEndDate);
          sap.ui.getCore().byId('popoverNav--tfEnd').setValue(dispDate);
          var startDate = this._tmpStartDate === null ? this._globalStartDate : this._tmpStartDate;
          msg = HELPER.periodValidation(startDate, this._tmpEndDate, period);
          sap.startDate = startDate;
        } else {
          this._tmpStartDate = HELPER.getSearchDate(period, date, true);
          dispDate = HELPER.getDisplayDate(period, this._tmpStartDate);
          sap.ui.getCore().byId('popoverNav--tfStart').setValue(dispDate);
          var endDate = this._tmpEndDate === null ? this._globalEndDate : this._tmpEndDate;
          msg = HELPER.periodValidation(this._tmpStartDate, endDate, period);

        }
        
        if (msg !== '') {
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(false);
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText("* " + this.oBundle.getText(msg));
        } else {
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(true);
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText("");
        }

        var clearCalendar = function (oCalendar) {
          oCalendar.addSelectedDate(new sap.ui.unified.DateRange({
            startDate: new Date()
          }));
        };

        var oCalendar1 = sap.ui.getCore().byId(
          "popoverNav--calendar1");
        var oCalendar2 = sap.ui.getCore().byId(
          "popoverNav--calendar2");
        clearCalendar(oCalendar1);
        clearCalendar(oCalendar2);

        var oNavCon = sap.ui.core.Fragment.byId("popoverNav", "nav");
        //var oMasterPage = sap.ui.core.Fragment.byId("popoverNav", "master-selection");
        oNavCon.back();
      },

      /**
       * Handle the click event on 'OK' button of time filter dialog
       * @param oEvent
       */
      onGlobalTimeFilter: function (oEvent) {

        var kpiName = this._kpiNames[this._sCategory][this.c1][this.c2];
        sap.ui.getCore().byId("popoverNav--timeFilter").close();
        var fDate = this._tmpStartDate === null ? this._globalStartDate :
          this._tmpStartDate;
        var tDate = this._tmpEndDate === null ? this._globalEndDate : this._tmpEndDate;
        var period = this._tmpPeriod === null ? this._globalPeriod : this._tmpPeriod;

        //if no changes, do nothing
        if (period === this._globalPeriod) {
          if (fDate === this._globalStartDate && tDate === this._globalEndDate) {
            return;
          }

        }
        var msg = "";
        if (!this.isValidPeriod(kpiName, period)) {
          msg = this.oBundle.getText("invalid_period");
        } else {
          msg = HELPER.periodValidation(fDate, tDate, period);
        }

        if (msg !== "") {
          sap.ui.getCore().byId("warn-msg").setText(this.oBundle.getText(msg));
          this._warnMsgDlg.open();
          sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
            true);

        } else {
          this._globalStartDate = fDate;
          this._globalEndDate = tDate;
          sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
            false);
          this._globalPeriod = period;
          this._globalPeriodLegend = period

          var curSubCompCharts = this._kpiCharts[this.c1];

          this.loaded = 0;
          for (var i = 0; i < curSubCompCharts.length; i++) {
            this.setColumn2ChartModel(curSubCompCharts[i]);
          }

          // remove charts of other sub-components
          for (var j = 0; j < this._kpiCharts.length; j++) {
            if (j !== this.c1) {
              this._kpiCharts[j] = [];
            }
          }
          // remove models of dimension charts and reload current dimension
          // charts
          this.clearDimData();
          this.setColumn3ChartModel(this._dimCharts[this.selectedDim]);

        }
        // re-load model for kpi charts on column 2

        var dispEndDate = HELPER.getDisplayDate(this._globalPeriod, this._globalEndDate);
        var dispStartDate = HELPER.getDisplayDate(this._globalPeriod, this._globalStartDate);
        this.showDateSelected(this._globalStartDate, this._globalEndDate,
          this._globalPeriod);
        sap.startDate = this._globalStartDate;
        sap.ui.getCore().byId("popoverNav--tfStart").setValue(dispStartDate);
        sap.ui.getCore().byId("popoverNav--tfEnd").setValue(dispEndDate);
        sap.ui.getCore().byId("popoverNav--" + this._globalPeriod).setSelected(
          true);
        //clear tmp period and dates
        this._tmpPeriod = null;
        this._tmpStartDate = null;
        this._tmpEndDate = null;

      },

      checkPeriod: function (oEvent) {

      },

      /**
       * Return the type of oChart
       * @param oChart
       */
      getDefectType: function (oChart) {
        var id = oChart.sId;
        if (id.indexOf("pie") > -1) return "pie";
        else if (id.indexOf("bar") > -1) return "bar";
        else return "dual_combination";
      },

      /**
       * Only Year and Month are the valid period for the KPIs in
       * huawei.cmes.quality.setting.Config.periodSpecKPIs
       * @param oKPI
       * @param oPeriod
       */
      isValidPeriod: function (oKPI, oPeriod) {
        var specialKPIs = huawei.cmes.quality.setting.Config.periodSpecKPIs;
        var limitedPeriods = ["YEAR", "MONTH"];
        if (specialKPIs.indexOf(oKPI) >= 0 && limitedPeriods.indexOf(oPeriod) <
          0) {
          return false;
        } else return true;
      },

      /**
       * Show selected date on the page
       * @param fDate
       * @param tDate
       * @param periodText
       */
      showDateSelected: function (fDate, tDate, periodText) {
        var startDate = fDate || this._globalStartDate;
        var endDate = tDate || this._globalEndDate;
        var period = periodText || this._globalPeriod;

        //var showPeriodText = periodText || 'month';
        startDate = HELPER.getDisplayDate(period, startDate);
        endDate = HELPER.getDisplayDate(period, endDate);

        var showDateSelect = this.oBundle.getText('TimePeriod');
        showDateSelect += (startDate + ' - ' + endDate);
        showDateSelect += ' | ';
        showDateSelect += this.oBundle.getText('TimeUnit');
        showDateSelect += this.oBundle.getText(period);

        this.byId('date-selected-text').setText(showDateSelect);
      },

      /**
       * handle the select event on period radio button
       */
      onPeriodSelect: function () {
        var periodList = sap.ui.getCore().byId("popoverNav--periodList").getItems();
        for (var i = 0; i < periodList.length; i++) {
          if (periodList[i].getSelected()) {
            var period = periodList[i].getId().split("--")[1];
            this._tmpPeriod = period;
            break;
          }
        }
        this._tmpPeriod = (this._tmpPeriod === null) ? this._globalPeriod :
          this._tmpPeriod;
        this._tmpStartDate = (this._tmpStartDate === null) ? this._globalStartDate :
          this._tmpStartDate;
        this._tmpEndDate = (this._tmpEndDate === null) ? this._globalEndDate :
          this._tmpEndDate;

        /*console.log(this._tmpPeriod,this._tmpStartDate,this._tmpEndDate);*/
        sap.ui.getCore().byId("popoverNav--tfStart").setValue(HELPER.getDisplayDate(
          this._tmpPeriod, this._tmpStartDate));
        sap.ui.getCore().byId("popoverNav--tfEnd").setValue(HELPER.getDisplayDate(
          this._tmpPeriod, this._tmpEndDate));

        var msg = HELPER.periodValidation(this._tmpStartDate, this._tmpEndDate, this._tmpPeriod);

        if (msg !== '') {
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(false);
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText("* " + this.oBundle.getText(msg));
        } else {
          sap.ui.getCore().byId('popoverNav--tf-warnmsg').setText('');
          sap.ui.getCore().byId('popoverNav--tf-okBtn').setEnabled(true);
        }

      },


      onTimeFilterPopoverClose: function (oEvent) {
        this._tmpPeriod = null;
        this._tmpStartDate = null;
        this._tmpEndDate = null;
        sap.ui.getCore().byId("popoverNav--timeFilter").close();
      },

      onSubChartPopoverClose: function (oEvent) {
        this._chartDlg.close();
        $('.v-clippath').remove();
      },

      onWarnDlgClose: function () {
        this._warnMsgDlg.close();
      },

      navToHomePage: function () {
        // this.bus.publish("nav", "backMaster"); 
        window.location.href = 'index.html';
      },


      onViewChartPopover: function (oEvent) {
        var oButton = oEvent.getSource();

        jQuery.sap.delayedCall(0, this, function () {
          this._defectChartTypePopover.openBy(oButton);
        });
      }

    });
})();
