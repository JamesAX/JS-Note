jQuery.sap.declare("huawei.cmes.quality.setting.Config");


huawei.cmes.quality.setting.Config = {
/* 
  getTileIcons : function(){
    var icons = ["sap-icon://product","sap-icon://lateness","sap-icon://person-placeholder","sap-icon://alert"];
    return icons;
  }*/

    
 
};

//The tile icons on column 1 for 4 sub-components
huawei.cmes.quality.setting.Config.tileIcons = ["sap-icon://product","sap-icon://lateness","sap-icon://person-placeholder","sap-icon://alert"];

//The KPIs that only Year and Month are the valid period
huawei.cmes.quality.setting.Config.periodSpecKPIs = ["MMIN01","MMIN02","CCN","CCR","DFR"];

//Only these KPIs that need to show defect chart area 
huawei.cmes.quality.setting.Config.defectKPIs = ["TPY","DDR","DPMO","LAR","RIDPPM","FDPPM","MMQI","DFR","CCI","MMQI","MPQI"];

//The KPIs that need to adjust the Yaxis values
huawei.cmes.quality.setting.Config.percentValueYAxis = ["LAR","LAR_MAT_CEG","LAR_MAT_CATE_B","LAR_AT_CATE_S"];
