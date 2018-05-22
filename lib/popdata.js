// get the URL parameters received from the authorization server
var state = getUrlParameter("state");  
var code = getUrlParameter("code");    // authorization code

//get the URL parameters if server responded with error and error URI
var qerror = getUrlParameter("error");
var qerror_uri = getUrlParameter("error_uri");

//load app session
var params = JSON.parse(sessionStorage[state]);  
var tokenUri = params.tokenUri;
var clientId = params.clientId;
var serviceUri = params.serviceUri;
var redirectUri = params.redirectUri;

if ((code) && (state) && (clientId) && (redirectUri) && (tokenUri)){
	
	var aTokenErr = "";
	
	// Prep the token exchange call parameters
	var tokenexchangedata = {
		code: code,
		grant_type: 'authorization_code',
		client_id: clientId,
		redirect_uri: redirectUri,
		state: state
	};
		
	var options;		        
	options = {
		url: tokenUri,
		type: 'POST',
		data: tokenexchangedata,
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/x-www-form-urlencoded"			
		}
	};

	//get access token			
	$.ajax(options).
	done(function(data, textStatus, jqXHR){  
		//var res1 = JSON.stringify(data); // this converts javascript object to json string
		//var res2 = JSON.parse(data); //this converts json string to javascript object
		//console.log(res1);
		accessToken = data.access_token;
		patientId = data.patient;
		encounterId = data.encounter;
		//patientId = 4884008;
		if (accessToken && patientId){
			//console.log("patientID is => " + patientId);
			callAPIs(serviceUri, patientId, accessToken);		
		}
	})
	.fail(function(jqXHR, textStatus, errorThrown){
		if (qerror_uri){
			window.location.href = qerror_uri;
		}
		else {
			//console.log("Access Token retrieval error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);
			aTokenErr = "Access Token retrieval error<br>Error Text: " + textStatus + "<br>Status Code: " + jqXHR.status + "<br>Error Thrown: " + errorThrown;
			document.getElementById("aTokenErr").innerHTML = "<br>" + aTokenErr + "<br>";
		}
	});
}
else {
	if (qerror_uri){		
		window.location.href = qerror_uri;
	}
	else {		
		aTokenErr = "Unable to prepare call to get Access Token"
		document.getElementById("aTokenErr").innerHTML = "<br>" + aTokenErr + "<br>";
	}
}

function callAPIs(serviceUri, pid, atoken){
	
    var paturl = serviceUri + "/Patient/" + pid;
	var condurl = serviceUri + "/Condition?patient=" + pid;
	var procurl = serviceUri + "/Procedure?patient=" + pid;
	var allurl = serviceUri + "/AllergyIntolerance?patient=" + pid;
	var medsurl = serviceUri + "/MedicationStatement?patient=" + pid + "&_count=100";
	var medsadminurl = serviceUri + "/MedicationAdministration?patient=" + pid + "&_count=100";
	var bpurl = serviceUri + "/Observation?patient=" + pid + "&category=vital-signs&code=http://loinc.org%7C55284-4&_count=100";
	var htwturl = serviceUri + "/Observation?patient=" + pid + "&category=vital-signs&code=http://loinc.org%7C8302-2,http://loinc.org%7C3141-9&_count=100";	
	var labsurl = serviceUri + "/Observation?patient=" + pid + "&category=laboratory&_count=100";	
	var vitalsurl = serviceUri + "/Observation?patient=" + pid + "&category=vital-signs&code=http://loinc.org%7C9279-1,http://loinc.org%7C8867-4&_count=100";
	var dianosticgurl = serviceUri + "/DiagnosticReport?patient=" + pid + "&_count=100";
	
	populatePatientDemog(atoken, paturl);
	populateConditions(atoken, condurl);
	populateProcedures(atoken, procurl);
	populateAllergies(atoken, allurl);
	populateMedications(atoken, medsurl);
	populateMedsAdmin(atoken, medsadminurl);
	populateBP(atoken, bpurl);
	populatehtwt(atoken, htwturl);
	populateLabs(atoken, labsurl);
	populateVitals(atoken, vitalsurl);
	getDiagnosticReportURLs(atoken, dianosticgurl);	
	
	return;
}

function populatePatientDemog(atoken, url){
	
	var lname = "",
	fname = "",
	mname = "",
	sbirthdate = "",
	sgender = "",
	patmedicalrecordnumber = [],
	patientmaritalStatus = "",
	patientrace = "",
	patientethnicity = "",
	patienthomephone = "",
	patientworkphone = "",
	patientmobilephone = "",
	patientemail = "",
	//patientaddressline = "",
	patientaddressline = [],
	patientcity = "",
	patientstate = "",
	patientzip = "",	
	patientDemographicsError = "";
		
	var MRNindex = 0;
	var lineindex = 0;
	
	var populatePatientDemogoptions;
	
    populatePatientDemogoptions = {
        url: url,
        type: "GET",
		//async: false,
        dataType: "json",
        headers: {
            "Accept": "application/json+fhir",
			"Authorization": "Bearer " + atoken			
        }
    };	
		
	$.ajax(populatePatientDemogoptions).
		done(function(pt, textStatus, jqXHR){	
			//var patdata = pt;
			//console.log(patdata);
			//console.log(JSON.stringify(pt));			
			if (pt){
				//get name
				if (pt.name){
					var name = pt.name;
					name.forEach(function(namedata){ 
						if (namedata.use && namedata.use === "official"){
							if (namedata.family){
								var family = namedata.family;
								family.forEach(function(familynamedata){
									if (familynamedata){
										lname = familynamedata;
										document.getElementById("lname").innerHTML = lname + ", ";	
									}											
								})				
							}
																							
							if (namedata.given){
								var givennameCnt = 0;
								var given = namedata.given;
								given.forEach(function(givennamedata){
									givennameCnt++;							
									if (givennamedata){
										if (givennameCnt > 1){
											mname = givennamedata;
											document.getElementById("mname").innerHTML = " " + mname;	
										}
										else {
											fname = givennamedata;
											document.getElementById("fname").innerHTML = fname;	
										}
									}				
								})
							}
							
						}					
					})
				} 
			
				//get MRN
				if (pt.identifier) {
					var identifier = pt.identifier;
					identifier.forEach(function(identifierdata){
						if (identifierdata.type.coding){	
							var coding = identifierdata.type.coding;
							coding.forEach(function(identifiercodingdata){
								if (identifiercodingdata.code && identifiercodingdata.code === "MR"){
									if (identifierdata.value){
										if (MRNindex > 0){
											patmedicalrecordnumber[MRNindex] = " " + identifierdata.value;
										}
										else {
											patmedicalrecordnumber[MRNindex] = identifierdata.value;
										}
										MRNindex++;										
									}
									document.getElementById("patmedicalrecordnumber").innerHTML = patmedicalrecordnumber;
								}					
							})					
						}
					})		
				}										
										
				if (pt.birthDate){
					sbirthdate = pt.birthDate;
					document.getElementById("sbirthdate").innerHTML = sbirthdate;	
				}
				
				if (pt.gender){
					sgender = pt.gender;
					document.getElementById("sgender").innerHTML = sgender;	
				}	

				//get marital status
				if (pt.maritalStatus){
					if (pt.maritalStatus.text){
						patientmaritalStatus = pt.maritalStatus.text;
						document.getElementById("patientmaritalStatus").innerHTML = patientmaritalStatus;	
					}
				}
				
				// get race and ethnicity
				if (pt.extension){
					var extension = pt.extension;
					extension.forEach(function(extdata){
						if (extdata.url == "http://fhir.org/guides/argonaut/StructureDefinition/argo-race") {
							if (extdata.extension){
								var extension2 = extdata.extension;
								extension2.forEach(function(extdata2){
									if (extdata2.valueString){
										patientrace = extdata2.valueString;
										document.getElementById("patientrace").innerHTML = patientrace;
									}
								})
							}
						}
						if (extdata.url == "http://fhir.org/guides/argonaut/StructureDefinition/argo-ethnicity") {							
							if (extdata.extension){								
								var extension2 = extdata.extension;
								extension2.forEach(function(extdata2){									
									if (extdata2.valueString){										
										patientethnicity = extdata2.valueString;
										document.getElementById("patientethnicity").innerHTML = patientethnicity;
									}
								})
							}
						}
					})				
				}
				
				//get address
				if (pt.address){
					var address = pt.address;
					address.forEach(function(add){
						if (add.use){
							if (add.use === "home"){
								if(add.line){
									var addline = add.line;
									addline.forEach(function(addlinedata){	
										if (lineindex > 0){
											patientaddressline[lineindex] = "<br>" + addlinedata;
										}
										else {
											patientaddressline[lineindex] = addlinedata;
										}
										lineindex++;
										document.getElementById("patientaddressline").innerHTML = patientaddressline;
									})								 
								}										
								if (add.city){
									patientcity = add.city;	
									document.getElementById("patientcity").innerHTML = patientcity;									
								}
								if (add.state){
									patientstate = add.state;	
									document.getElementById("patientstate").innerHTML = patientstate + ", ";										
								}
								if (add.postalCode){
									patientzip = add.postalCode;
									document.getElementById("patientzip").innerHTML = patientzip;
								}
							}	
						}
					})
				}
		
				//get telephone
				if (pt.telecom){
					var tele = pt.telecom;
					tele.forEach(function(teledata){
						if (teledata.system && teledata.system === "phone"){
							if (teledata.use && teledata.use === "home") {
								if (teledata.value){
									patienthomephone = teledata.value;
									document.getElementById("patienthomephone").innerHTML = patienthomephone;
								}
							}
						}
						if (teledata.system && teledata.system === "phone"){
							if (teledata.use && teledata.use === "work") {
								if (teledata.value){
									patientworkphone = teledata.value;
									document.getElementById("patientworkphone").innerHTML = patientworkphone;
								}
							}
						}
						if (teledata.system && teledata.system === "phone"){
							if (teledata.use && teledata.use === "mobile") {
								if (teledata.value){
									patientmobilephone = teledata.value;
									document.getElementById("patientmobilephone").innerHTML = patientmobilephone;
								}
							}
						}
						if (teledata.system && teledata.system == "email"){
							if (teledata.value){
								patientemail = teledata.value;
								document.getElementById("patientemail").innerHTML = patientemail;
								
							}
						}
					})					
				}				
				
			}				
		})	
		.fail(function(jqXHR, textStatus, errorThrown){
			console.log("Error retrieving patient demographics - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);
			patientDemographicsError = "<br>Error retrieving patient demographics - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown + "<br>";
			document.getElementById("patientDemographicsError").innerHTML = patientDemographicsError;	
		});	
	
	return;	
	
};

function populateConditions(atoken, url){	
	
	var condTableData = "";
	var condition = "";
	var condcategory = "";
	var conddate = "";
	var condonsetdatetime = "";
	var condabatedatetime = "";
	var condstatus = "";
	var condclinicalstatus = "";
	var condseverity = "";
	var condICD10Code = "";
	var condsnomedCode = "";
		
	var conditionCnt = 0;
	var patconditionsData = "";
	var condtablepopulated = false;
			
	var populatecond;
	
    populatecond = {
        url: url,
        type: "GET",
		dataType: "json",
        headers: {
            "Accept": "application/json+fhir",
			"Authorization": "Bearer " + atoken			
        }
    };	
		
	$.ajax(populatecond).
		done(function(cond, textStatus, jqXHR){
			//console.log(JSON.stringify(cond));		
			if (cond){
				if (cond.entry){
					var entry = cond.entry;
					entry.forEach(function(conddata){						
						if (conddata.resource.verificationStatus && conddata.resource.verificationStatus != "entered-in-error"){
							if (conddata.resource.code && conddata.resource.code.text){
								condition = conddata.resource.code.text;
								condTableData += "<tr><td>" + condition + "</td>";	
								condtablepopulated = true;
								
								//get icd-10 and snomed codes
								condICD10Code = "";
								condsnomedCode = "";
								if (conddata.resource.code.coding){
									var codecoding = conddata.resource.code.coding;
									codecoding.forEach(function(codecodingdata){
										if(codecodingdata.system && codecodingdata.system === "http://hl7.org/fhir/sid/icd-10-cm"){
											if (codecodingdata.code){
												condICD10Code = codecodingdata.code;
											}												
										}
										
										if(codecodingdata.system && codecodingdata.system === "http://snomed.info/sct"){
											if (codecodingdata.code){
												condsnomedCode = codecodingdata.code;												
											}											
										}										
									})
									//populate ICD-10 and Snomed codes
									if (condICD10Code){
										condTableData += "<td>" + condICD10Code + "</td>";	
									}
									else {
										condTableData += "<td></td>";
									}
									
									if (condsnomedCode){
										condTableData += "<td>" + condsnomedCode + "</td>";	
									}
									else {
										condTableData += "<td></td>";
									}
								}
								else {
									condTableData += "<td></td><td></td>";
								}
						
								if (conddata.resource.category && conddata.resource.category.text){
									condcategory = conddata.resource.category.text;		
									condTableData += "<td>" + condcategory + "</td>";	
								}
								else {
									condTableData += "<td></td>";
								}
								
								if (conddata.resource.dateRecorded){
									conddate = conddata.resource.dateRecorded;
									condTableData += "<td>" + conddate + "</td>";
								}
								else {
									condTableData += "<td></td>";
								}

								if (conddata.resource.clinicalStatus){
									condclinicalstatus = conddata.resource.clinicalStatus;
									condTableData += "<td>" + condclinicalstatus + "</td>";
								}
								else {
									condTableData += "<td></td>";
								}	
								
								if (conddata.resource.verificationStatus){
									condstatus = conddata.resource.verificationStatus;
									condTableData += "<td>" + condstatus + "</td>";
								}
								else {
									condTableData += "<td></td>";
								}	
								
								if ((conddata.resource.severity) && (conddata.resource.severity.text)){
									condseverity = conddata.resource.severity.text;
									condTableData += "<td>" + condseverity + "</td>";
								}
								else {
									condTableData += "<td></td>";
								}	

								if (conddata.resource.onsetDateTime){
									condonsetdatetime = formatdttm(conddata.resource.onsetDateTime);
									condTableData += "<td>" + condonsetdatetime + "</td>";
								}
								else {
									condTableData += "<td></td>";
								}

								if (conddata.resource.abatementDateTime){
									condabatedatetime = formatdttm(conddata.resource.abatementDateTime);
									condTableData += "<td>" + condabatedatetime + "</td></tr>";
								}
								else {
									condTableData += "<td></td></tr>";
								}				
								
								conditionCnt++;
								document.getElementById("conditionCnt").innerHTML = conditionCnt;
							}	
						}					
					})
					if (condtablepopulated === true){
						patconditionsData = "<tr><th>Condition</th><th>ICD-10 Code</th><th>SNOMED Code</th><th>Category</th><th>Date Recorded</th><th>Clinical Status</th><th>Verification Status</th><th>Severity</th><th>On Set Dt/Tm</th><th>Abatement Dt/Tm</th></tr>" + condTableData;
					}
					else {
						patconditionsData = "<p class='w3-tiny'>Condition request returns no results.</p>";	
					}
				}
				else {
					patconditionsData = "<p class='w3-tiny'>Condition request returns no results.</p>";	
				}	
			}		
			else {
				patconditionsData = "<p class='w3-tiny'>Condition request returns no results.</p>";	
			}		
			
			document.getElementById("patconditionsData").innerHTML = patconditionsData;
		})	
		.fail(function(jqXHR, textStatus, errorThrown){	
			patconditionsData = "<br>Error retrieving conditions - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
			console.log("Error retrieving conditions: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);	
			document.getElementById("patconditionsData").innerHTML = patconditionsData;
		});	
	
	return;	
	
};

function populateProcedures(atoken, url){	
	
	var procTableData = "";
	var procedure = "";
	var procdate = "";
	var procstatus = "";
	var proclocation = "";
	var procCPTCode = "";
	var procsnomedCode = "";
	
	var procedureCnt = 0;
	var patproceduresData = "";
	var proctablepopulated = false;
			
	var populateproc;
	
    populateproc = {
        url: url,
        type: "GET",
		dataType: "json",
        headers: {
            "Accept": "application/json+fhir",
			"Authorization": "Bearer " + atoken			
        }
    };	
		
	$.ajax(populateproc).
		done(function(proc, textStatus, jqXHR){
			//console.log(JSON.stringify(proc));	
			if (proc){
				if (proc.entry){
					var entry = proc.entry;
					entry.forEach(function(procdata){						
						if (procdata.resource.status && procdata.resource.status != "entered-in-error"){
							if (procdata.resource.code && procdata.resource.code.text){
								procedure = procdata.resource.code.text;
								procTableData += "<tr><td>" + procedure + "</td>";						
								proctablepopulated = true;
								
								//get CPT and snomed codes
								procCPTCode = "";
								procsnomedCode = "";
								if (procdata.resource.code.coding){
									var codecoding = procdata.resource.code.coding;
									codecoding.forEach(function(codecodingdata){
										if(codecodingdata.system && codecodingdata.system === "http://www.ama-assn.org/go/cpt"){
											if (codecodingdata.code){
												procCPTCode = codecodingdata.code;
											}												
										}
										
										if(codecodingdata.system && codecodingdata.system === "http://snomed.info/sct"){
											if (codecodingdata.code){
												procsnomedCode = codecodingdata.code;												
											}											
										}										
									})
									//populate CPT and Snomed codes
									if (procCPTCode){
										procTableData += "<td>" + procCPTCode + "</td>";	
									}
									else {
										procTableData += "<td></td>";
									}
									
									if (procsnomedCode){
										procTableData += "<td>" + procsnomedCode + "</td>";	
									}
									else {
										procTableData += "<td></td>";
									}
								}
								else {
									procTableData += "<td></td><td></td>";
								}
						
								if (procdata.resource.performedDateTime){
									procdate = formatdttm(procdata.resource.performedDateTime);		
									procTableData += "<td>" + procdate + "</td>";		
								}
								else {
									procTableData += "<td></td>";		
								}
								
								if ((procdata.resource.location) && (procdata.resource.location.display)){
									proclocation = procdata.resource.location.display;
									procTableData += "<td>" + proclocation + "</td>";
								}
								else {
									procTableData += "<td></td>";
								}	
								
								if (procdata.resource.status){
									procstatus = procdata.resource.status;
									procTableData += "<td>" + procstatus + "</td></tr>";		
								}
								else {
									procTableData += "<td></td></tr>";		
								}							
								procedureCnt++;
								document.getElementById("procedureCnt").innerHTML = procedureCnt;
							}	
						}					
					})
					if (proctablepopulated === true){
						patproceduresData = "<tr><th>Procedure</th><th>CPT Code</th><th>Snomed Code</th><th>Date Performed</th><th>Location</th><th>Status</th></tr>" + procTableData;
					}
					else {
						patproceduresData = "<p class='w3-tiny'>Procedure request returns no results.</p>";					
					}
				}
				else {
					patproceduresData = "<p class='w3-tiny'>Procedure request returns no results.</p>";
				}	
			}		
			else {
				patproceduresData = "<p class='w3-tiny'>Procedure request returns no results.</p>";
			}	
			
			document.getElementById("patproceduresData").innerHTML = patproceduresData;
		})	
		.fail(function(jqXHR, textStatus, errorThrown){	
			patproceduresData = "<br>Error retrieving procedures - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
			console.log("Error retrieving procedures: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);
			document.getElementById("patproceduresData").innerHTML = patproceduresData;			
		});	
		
	return;	
	
};

function populateAllergies(atoken, url){	
	
	var allTableData = "";
	var allergytext = "";
	var allergyreaction = "";
	var allergyCnt = 0;
	var patallergiesData = "";
	var allreporter = "";
	var allrecordedDate = "";
	var allstatus = "";
	var allcriticality = "";
	var alltype = "";
	var allcategory = "";
	var allergytablepopulated = false;	
			
	var populateall;
	
    populateall = {
        url: url,
        type: "GET",
		dataType: "json",
        headers: {
            "Accept": "application/json+fhir",
			"Authorization": "Bearer " + atoken			
        }
    };	
		
	$.ajax(populateall).
		done(function(all, textStatus, jqXHR){
			//console.log(JSON.stringify(all));	
			if (all){
				if (all.entry){
					var entry = all.entry;
					entry.forEach(function(alldata){						
						if (alldata.resource.status && alldata.resource.status != "entered-in-error"){
							if (alldata.resource.substance && alldata.resource.substance.text){
								allergytext = alldata.resource.substance.text;
								allTableData += "<tr><td>" + allergytext + "</td>";
								allergytablepopulated = true;
								
								//reaction->manifestation corrected for the array
								if (alldata.resource.reaction){
									allergyreaction = "";
									var reaction = alldata.resource.reaction;
									reaction.forEach(function(reactiondata){
										if (reactiondata.manifestation){
											var allmanif = reactiondata.manifestation;
											allmanif.forEach(function(allmanifdata){									
												if (allmanifdata.text){
													if (allergyreaction) {											
														allergyreaction += ", " + allmanifdata.text;
													}
													else {
														allergyreaction += allmanifdata.text;
													}
												}									
											})
											
										}
									})
									allTableData += "<td>" + allergyreaction + "</td>";						
								}
								else {
									allTableData += "<td></td>";
								}
								
								if (alldata.resource.status){
									allstatus = alldata.resource.status;
									allTableData += "<td>" + allstatus + "</td>";
								}
								else {
									allTableData += "<td></td>";
								}
								
								if (alldata.resource.criticality){
									allcriticality = alldata.resource.criticality;
									allTableData += "<td>" + allcriticality + "</td>";
								}
								else {
									allTableData += "<td></td>";
								}
								
								if (alldata.resource.type){
									alltype = alldata.resource.type;
									allTableData += "<td>" + alltype + "</td>";
								}
								else {
									allTableData += "<td></td>";
								}
								
								if (alldata.resource.category){
									allcategory = alldata.resource.category;
									allTableData += "<td>" + allcategory + "</td>";
								}
								else {
									allTableData += "<td></td>";
								}
								
								if (alldata.resource.recordedDate){
									allrecordedDate = formatdttm(alldata.resource.recordedDate);
									allTableData += "<td>" + allrecordedDate + "</td>";
								}
								else {
									allTableData += "<td></td>";
								}
								
								if ((alldata.resource.reporter) && (alldata.resource.reporter.display)){
									allreporter = alldata.resource.reporter.display;
									allTableData += "<td>" + allreporter + "</td></tr>";
								}
								else {
									allTableData += "<td></td></tr>";
								}
								
								allergyCnt++;
								document.getElementById("allergyCnt").innerHTML = allergyCnt;
							}	
						}					
					})
					if (allergytablepopulated === true){
						patallergiesData = "<tr><th>Allergy</th><th>Reaction</th><th>Status</th><th>Criticality</th><th>Type</th><th>Category</th><th>Recorded Dt/Tm</th><th>Reporter</th></tr>" + allTableData;	
					}
					else {
						patallergiesData = "<p class='w3-tiny'>Allergy request returns no results.</p>";					
					}
				}
				else {
					patallergiesData = "<p class='w3-tiny'>Allergy request returns no results.</p>";
				}	
			}		
			else {
				patallergiesData = "<p class='w3-tiny'>Allergy request returns no results.</p>";
			}		
				
			document.getElementById("patallergiesData").innerHTML = patallergiesData;
		})	
		.fail(function(jqXHR, textStatus, errorThrown){	
			patallergiesData = "<br>Error retrieving allergies - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;			
			console.log("Error retrieving allergies: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);	
			document.getElementById("patallergiesData").innerHTML = patallergiesData;
		});	
		
	return;		
};

function populateMedications(atoken, url){	
	
	var medsTableData = "";
	var medsRXNormdisplay = "";
	var medsRXNormcode = "";
	var medsText = "";
	var medsdateAsserted = "";
	var medsstatus = "";
	var medswasnotTaken = "";
	var medseffectivestartdttm = "";
	var medseffectiveenddttm = "";
	var medscategory = "";
	var medsdosage = "";
	var medsdosagetiming = "";
	var medsdosageroute = "";
	var medsdosagequantityvalue = "";
	var medsdosagequantityunit = "";
	var medstablepopulated = false;
			
	var medsCnt = 0;
	var patmedsData = "";
	var patmedsDataError = "";
	
	var populatemeds;
	
	do {	
		var nextpagefound = false;
	
		populatemeds = {
			url: url,
			type: "GET",
			dataType: "json",
			async: false,
			headers: {
				"Accept": "application/json+fhir",
				"Authorization": "Bearer " + atoken			
			}
		};	
		
		$.ajax(populatemeds).
			done(function(meds, textStatus, jqXHR){
				//console.log(JSON.stringify(meds));	
				if (meds){
					if (meds.entry){
						var entry = meds.entry;				
						entry.forEach(function(medsdata){
							
							//blank out variables so they don't retain previous values since these are not being put in html table below if statement.
							medsText = "";
							medsRXNormdisplay = "";
							medsRXNormcode = "";
								
							if (medsdata.resource.medicationCodeableConcept){
								
								if (medsdata.resource.medicationCodeableConcept.text){
									medsText = medsdata.resource.medicationCodeableConcept.text;								
								}
								if (medsdata.resource.medicationCodeableConcept.coding){
									var medscoding = medsdata.resource.medicationCodeableConcept.coding;
									medscoding.forEach(function(medscodingdata){
										if(medscodingdata.system === "http://www.nlm.nih.gov/research/umls/rxnorm"){
											if (medscodingdata.display){
												medsRXNormdisplay = medscodingdata.display											
											}										
											if (medscodingdata.code){
												medsRXNormcode = medscodingdata.code;
											}
										}									
									})
								}							
							}
											
							if (medsText || medsRXNormdisplay){
								medsTableData += "<tr><td>" + medsText + "</td><td>" + medsRXNormdisplay + "</td><td>" + medsRXNormcode + "</td>";
								medstablepopulated = true;
								
								if(medsdata.resource.dateAsserted){
									medsdateAsserted = formatdttm(medsdata.resource.dateAsserted);
									medsTableData += "<td>" + medsdateAsserted + "</td>";
								}
								else {
									medsTableData += "<td></td>";
								}
																
								if(medsdata.resource.status){
									medsstatus = medsdata.resource.status;
									medsTableData += "<td>" + medsstatus + "</td>";
								}
								else {
									medsTableData += "<td></td>";
								}
								
								if(String(medsdata.resource.wasNotTaken)){
									medswasnotTaken = medsdata.resource.wasNotTaken;
									if (medswasnotTaken === false) {
										medsTableData += "<td>Yes</td>";
									}
									else if (medswasnotTaken === true){
										medsTableData += "<td>No</td>";
									}
									else {
										medsTableData += "<td></td>";
									}
								}
								else {
									medsTableData += "<td></td>";
								}
																								
								//category via extension								
								if (medsdata.resource.extension){
									var catext = medsdata.resource.extension;
									catext.forEach(function(medscategory){
										if (medscategory.url === "https://fhir-ehr.cerner.com/dstu2/StructureDefinition/medication-statement-category"){
											if(medscategory.valueCodeableConcept && medscategory.valueCodeableConcept.text){
												medscategory = medscategory.valueCodeableConcept.text;
												medsTableData += "<td>" + medscategory + "</td>";
											}
											else {
												medsTableData += "<td></td>";
											}
										}
										else {
											medsTableData += "<td></td>";
										}
									})
								}
								else {
									medsTableData += "<td></td>";
								}
								
								//dosage
								if (medsdata.resource.dosage){
									var dosage = medsdata.resource.dosage;
									dosage.forEach(function(dosagedata){
										
										if (dosagedata.text){
											medsdosage = dosagedata.text;
											medsTableData += "<td>" + medsdosage + "</td>";
										}
										else {
											medsTableData += "<td></td>";
										}
																														
										if (dosagedata.timing){
											if (dosagedata.timing.repeat && dosagedata.timing.repeat.boundsPeriod){
												if (dosagedata.timing.repeat.boundsPeriod.start){
													medseffectivestartdttm = formatdttm(dosagedata.timing.repeat.boundsPeriod.start);
													medsTableData += "<td>" + medseffectivestartdttm + "</td>";
												}
												else {
													medsTableData += "<td></td>";
												}
												if (dosagedata.timing.repeat.boundsPeriod.end){
													medseffectiveenddttm = formatdttm(dosagedata.timing.repeat.boundsPeriod.end);
													medsTableData += "<td>" + medseffectiveenddttm + "</td>";
												}
												else {
													medsTableData += "<td></td>";
												}
											}
											else {
												medsTableData += "<td></td><td></td>";
											}
											
											if (dosagedata.timing.code && dosagedata.timing.code.text){
												medsdosagetiming = dosagedata.timing.code.text;
												medsTableData += "<td>" + medsdosagetiming + "</td>";
											}
											else {
												medsTableData += "<td></td>";
											}
											
										}
										else {
											medsTableData += "<td></td><td></td><td></td>";
										}
										
										if (dosagedata.route){
											if (dosagedata.route.text){
												medsdosageroute = dosagedata.route.text;
												medsTableData += "<td>" + medsdosageroute + "</td>";
											}
											else {
												medsTableData += "<td></td>";
											}
										}
										else {
											medsTableData += "<td></td>";
										}
																				
										if (dosagedata.quantityQuantity){
											if (dosagedata.quantityQuantity.value){
												medsdosagequantityvalue = dosagedata.quantityQuantity.value;
											}
											if (dosagedata.quantityQuantity.unit){
												medsdosagequantityunit = dosagedata.quantityQuantity.unit;
											}
											
											if (medsdosagequantityvalue){
												medsTableData += "<td>" + medsdosagequantityvalue + " " + medsdosagequantityunit + "</td></tr>";
											}
											else {
												medsTableData += "<td></td></tr>";
											}
											
										}
										else {
											medsTableData += "<td></td></tr>";
										}
										
									})
								}
								else{
									medsTableData += "<td></td><td></td><td></td><td></td></tr>";
								}
								
								medsCnt++;
								document.getElementById("medsCnt").innerHTML = medsCnt;								
							}					
						})					
					}
										
					//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
					if (meds.link){
						var medslink = meds.link;
						medslink.forEach(function(medslinkdata){						
							if (medslinkdata.relation && medslinkdata.relation === "next"){
								url = medslinkdata.url;
								nextpagefound = true;
							}						
						})								
					}					
				}				
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				patmedsDataError = "<br>Error retrieving medications - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;			
				console.log("Error retrieving medications: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);					
			});	
		
	}
	while (nextpagefound === true);
	
	if (medstablepopulated === true){
		patmedsData = "<tr><th>Medication</th><th>RX Norm Display</th><th>RX Norm Code</th><th>Date Asserted </th><th>Status</th><th>Med Taken</th><th>Category</th><th>Dosage</th><th>Effective Start Dt/Tm</th><th>Effective End Dt/Tm</th><th>Timing</th><th>Route</th><th>Quantity</th></tr>" + medsTableData;	
	}
	else if (patmedsDataError){
		patmedsData = patmedsDataError;
	}
	else {
		patmedsData = "<p class='w3-tiny'>Medications request returns no results.</p>";					
	}
	
	document.getElementById("patmedsData").innerHTML = patmedsData;
	
	return;		
};

function populateMedsAdmin(atoken, url){	
	
	var medsadminTableData = "";
	var medsadminRXNormdisplay = "";
	var medsadminRXNormcode = "";
	var medsadminText = "";
	var medsadminstatus = "";
	var medsadminwasnotGiven = "";
	var medsadmineffectivestartdttm = "";
	var medsadmineffectiveenddttm = "";
	var medsadmineffectivedttm = "";
	var medsadmindosage = "";
	var medsadmindosagetiming = "";
	var medsadmindosageroute = "";
	var medsadmindosagesite = "";
	var medsadmindosagequantityvalue = "";
	var medsadmindosagequantityunit = "";
	var medsadminrateRationumeratorValue = "";
	var medsadminrateRationumeratorUnit = "";
	var medsadminrateRatiodenominatorValue = "";
	var medsadminrateRatiodenominatorUnit = "";
	var medsadmintablepopulated = false;
		
	var medsadminCnt = 0;
	var patmedsadminData = "";
	var patmedsadminDataError = "";
				
	var populatemedsadmin;
	
	do {	
		var nextpagefound = false;
	
		populatemedsadmin = {
			url: url,
			type: "GET",
			dataType: "json",
			async: false,
			headers: {
				"Accept": "application/json+fhir",
				"Authorization": "Bearer " + atoken			
			}
		};	
		
		$.ajax(populatemedsadmin).
			done(function(medsadmin, textStatus, jqXHR){
				//console.log(JSON.stringify(medsadmin));	
				if (medsadmin){
					if (medsadmin.entry){
						var entry = medsadmin.entry;				
						entry.forEach(function(medsadmindata){
							
							//blank out variables so they don't retain previous values since these are not being put in html table below if statement.
							medsadminText = "";
							medsadminRXNormdisplay = "";
							medsadminRXNormcode = "";
								
							if (medsadmindata.resource.medicationCodeableConcept){
								
								if (medsadmindata.resource.medicationCodeableConcept.text){
									medsadminText = medsadmindata.resource.medicationCodeableConcept.text;								
								}
								if (medsadmindata.resource.medicationCodeableConcept.coding){
									var medsadmincoding = medsadmindata.resource.medicationCodeableConcept.coding;
									medsadmincoding.forEach(function(medsadmincodingdata){
										if(medsadmincodingdata.system === "http://www.nlm.nih.gov/research/umls/rxnorm"){
											if (medsadmincodingdata.display){
												medsadminRXNormdisplay = medsadmincodingdata.display											
											}										
											if (medsadmincodingdata.code){
												medsadminRXNormcode = medsadmincodingdata.code;
											}
										}									
									})
								}							
							}
											
							if (medsadminText || medsadminRXNormdisplay){
								medsadminTableData += "<tr><td>" + medsadminText + "</td><td>" + medsadminRXNormdisplay + "</td><td>" + medsadminRXNormcode + "</td>";
								medsadmintablepopulated = true;
																								
								if(medsadmindata.resource.status){
									medsadminstatus = medsadmindata.resource.status;
									medsadminTableData += "<td>" + medsadminstatus + "</td>";
								}
								else {
									medsadminTableData += "<td></td>";
								}
								
								if(String(medsadmindata.resource.wasNotGiven)){
									medsadminwasnotGiven = medsadmindata.resource.wasNotGiven;
									if (medsadminwasnotGiven === false) {
										medsadminTableData += "<td>Yes</td>";
									}
									else if (medsadminwasnotGiven === true){
										medsadminTableData += "<td>No</td>";
									}
									else {
										medsadminTableData += "<td></td>";
									}
								}
								else {
									medsadminTableData += "<td></td>";
								}
								
								if (medsadmindata.resource.effectiveTimeDateTime){
									medsadmineffectivedttm = formatdttm(medsadmindata.resource.effectiveTimeDateTime);
									medsadminTableData += "<td>" + medsadmineffectivedttm + "</td>";
								}
								else {
									medsadminTableData += "<td></td>";
								}								
								
								//effective start and end date time
								if (medsadmindata.resource.effectiveTimePeriod){
									if (medsadmindata.resource.effectiveTimePeriod.start){
										medsadmineffectivestartdttm = formatdttm(medsadmindata.resource.effectiveTimePeriod.start);
										medsadminTableData += "<td>" + medsadmineffectivestartdttm + "</td>";
									}
									else {
										medsadminTableData += "<td></td>";
									}
									if (medsadmindata.resource.effectiveTimePeriod.end){
										medsadmineffectiveenddttm = formatdttm(medsadmindata.resource.effectiveTimePeriod.end);
										medsadminTableData += "<td>" + medsadmineffectiveenddttm + "</td>";
									}
									else {
										medsadminTableData += "<td></td>";
									}
								}
								else {
									medsadminTableData += "<td></td><td></td>";
								}
											
								//dosage
								if (medsadmindata.resource.dosage){
									var madosagedata = medsadmindata.resource.dosage;
									if (madosagedata.text){
										medsadmindosage = madosagedata.text;
										medsadminTableData += "<td>" + medsadmindosage + "</td>";
									}
									else {
										medsadminTableData += "<td></td>";
									}								
																				
									if (madosagedata.route){
										if (madosagedata.route.text){
											medsadmindosageroute = madosagedata.route.text;
											medsadminTableData += "<td>" + medsadmindosageroute + "</td>";
										}
										else {
											medsadminTableData += "<td></td>";
										}
									}
									else {
										medsadminTableData += "<td></td>";
									}
									
									//site
									if (madosagedata.siteCodeableConcept){
										if (madosagedata.siteCodeableConcept.text){
											medsadmindosagesite = madosagedata.siteCodeableConcept.text;
											medsadminTableData += "<td>" + medsadmindosagesite + "</td>";
										}
										else {
											medsadminTableData += "<td></td>";
										}
									}
									else {
										medsadminTableData += "<td></td>";
									}
									
									if (madosagedata.quantity){
										if (madosagedata.quantity.value){
											medsadmindosagequantityvalue = madosagedata.quantity.value;
										}
										if (madosagedata.quantity.unit){
											medsadmindosagequantityunit = madosagedata.quantity.unit;
										}
										
										if (medsadmindosagequantityvalue){
											medsadminTableData += "<td>" + medsadmindosagequantityvalue + " " + medsadmindosagequantityunit + "</td>";
										}
										else {
											medsadminTableData += "<td></td>";
										}
										
									}
									else {
										medsadminTableData += "<td></td>";
									}
									
									//rate ratio
									if (madosagedata.rateRatio){
										if (madosagedata.rateRatio.numerator){
											if (madosagedata.rateRatio.numerator.value && madosagedata.rateRatio.numerator.unit){
												medsadminrateRationumeratorValue = madosagedata.rateRatio.numerator.value;
												medsadminrateRationumeratorUnit = madosagedata.rateRatio.numerator.unit;
												medsadminTableData += "<td>" + medsadminrateRationumeratorValue + " " + medsadminrateRationumeratorUnit + "</td>";
											}
											else {
												medsadminTableData += "<td></td>";
											}
										}
										else {
											medsadminTableData += "<td></td>";
										}
										
										if (madosagedata.rateRatio.denominator){
											if (madosagedata.rateRatio.denominator.value && madosagedata.rateRatio.denominator.unit){
												medsadminrateRatiodenominatorValue = madosagedata.rateRatio.denominator.value;
												medsadminrateRatiodenominatorUnit = madosagedata.rateRatio.denominator.unit;
												medsadminTableData += "<td>" + medsadminrateRatiodenominatorValue + " " + medsadminrateRatiodenominatorUnit + "</td></tr>";
											}
											else {
												medsadminTableData += "<td></td></tr>";
											}
										}
										else {
											medsadminTableData += "<td></td></tr>";
										}
										
									}
									else {
										medsadminTableData += "<td></td><td></td></tr>";
									}										
									
								}
								else{
									medsadminTableData += "<td></td><td></td><td></td><td></td><td></td><td></td></tr>";
								}
								
								medsadminCnt++;
								document.getElementById("medsadminCnt").innerHTML = medsadminCnt;								
							}					
						})						
					}
										
					//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
					if (medsadmin.link){
						var medsadminlink = medsadmin.link;
						medsadminlink.forEach(function(medsadminlinkdata){						
							if (medsadminlinkdata.relation && medsadminlinkdata.relation === "next"){
								url = medsadminlinkdata.url;
								nextpagefound = true;
							}						
						})								
					}						
				}				
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				patmedsadminDataError = "<br>Error retrieving medication administration - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;			
				console.log("Error retrieving medications: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);				
			});	
		
	}
	while (nextpagefound === true);
	
	if (medsadmintablepopulated === true){
		patmedsadminData = "<tr><th>Medication</th><th>RX Norm Display</th><th>RX Norm Code</th><th>Status</th><th>Med Given</th><th>Effective Dt/Tm</th><th>Effective Start Dt/Tm</th><th>Effective End Dt/Tm</th><th>Dosage</th><th>Route</th><th>Site</th><th>Quantity</th><th>Rate Ratio Numerator</th><th>Rate Ratio Denominator</th></tr>" + medsadminTableData;	
	}
	else if (patmedsadminDataError){
		patmedsadminData = patmedsadminDataError;
	}
	else {
		patmedsadminData = "<p class='w3-tiny'>Medication Administration request returns no results.</p>";		
	}
	
	document.getElementById("patmedsadminData").innerHTML = patmedsadminData;
	
	return;		
};

function populateBP(atoken, url){	
			
	var sysbp = "";
	var sysbpunit = "";
	var diabp = "";
	var diabpunit = "";
	var bpdttm = "";
	var bpdata = "";
	var patbpData = ""; 
	var patbpDataError = "";
	var bpinterpretation = "";
	var bptablepopulated = false;
				
	var popbp;
	
	do {	
		var nextpagefound = false;
		
    popbp = {
        url: url,
        type: "GET",
		dataType: "json",
		async: false,
        headers: {
            "Accept": "application/json+fhir",
			"Authorization": "Bearer " + atoken			
        }
    };	
		
	$.ajax(popbp).
		done(function(bp, textStatus, jqXHR){
			if (bp){
				//console.log(JSON.stringify(bp));
				if (bp.entry){
					var entry = bp.entry;
					entry.forEach(function(bpvitdata){
						
						//reinitialize otherwise they will retain previous value and append it to the next iteration.
						bpdttm = "";
						bpinterpretation = "";
						sysbp = "";
						sysbpunit = "";
						diabp = "";
						diabpunit = "";
						
						//get BP
						if ((bpvitdata.resource.status && bpvitdata.resource.status === "final") && bpvitdata.resource.effectiveDateTime){
																					
							bpdttm = formatdttm(bpvitdata.resource.effectiveDateTime);
														
							if (bpvitdata.resource.interpretation){
								if (bpvitdata.resource.interpretation.coding){
									var bpinterpcoding = bpvitdata.resource.interpretation.coding;
									bpinterpcoding.forEach(function(bpinterpcodingdata){
										if (bpinterpcodingdata.system === "http://hl7.org/fhir/v2/0078"){
											if (bpinterpcodingdata.display){
												bpinterpretation = bpinterpcodingdata.display
											}
										}
									})
								}
							}
							
							if (bpvitdata.resource.component){
								var component = bpvitdata.resource.component;
								component.forEach(function(componentdata){									
									
									if (componentdata.code && componentdata.code.text && componentdata.code.text === "Systolic Blood Pressure"){
											
										if (componentdata.valueQuantity){
											if (componentdata.valueQuantity.value && componentdata.valueQuantity.unit){
												sysbp = componentdata.valueQuantity.value;
												sysbpunit = componentdata.valueQuantity.unit;											
											}										
										}																
									}																									
									if (componentdata.code && componentdata.code.text && componentdata.code.text === "Diastolic Blood Pressure"){
											
										if (componentdata.valueQuantity){
											if (componentdata.valueQuantity.value && componentdata.valueQuantity.unit){
												diabp = componentdata.valueQuantity.value;
												diabpunit = componentdata.valueQuantity.unit;
											}										
										}	
									}																	
								})
								
								bpdata +=  "<tr><td>" + sysbp + " " + sysbpunit + "</td><td>" + diabp + " " + diabpunit + "</td><td> " + bpdttm + "</td><td>" + bpinterpretation + "</td></tr>";
								bptablepopulated = true;								
							}								
						}									
					})				
				}
								
				//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
				if (bp.link){
					var bplink = bp.link;
					bplink.forEach(function(bplinkdata){						
						if (bplinkdata.relation && bplinkdata.relation === "next"){
							url = bplinkdata.url;
							nextpagefound = true;
						}						
					})								
				}					
			}		
		})	
		.fail(function(jqXHR, textStatus, errorThrown){	
			patbpDataError = "<br>Error retrieving BP - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
			console.log("Error retrieving BP - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);
				
		});	
	
	}
	while (nextpagefound === true);
	
	//populate BP
	if (bptablepopulated === true){
		patbpData = "<tr><th>Systolic BP</th><th>Diastolic BP</th><th>Date</th><th>Interpretation</th></tr>" + bpdata;
	}
	else if (patbpDataError){
		patbpData = patbpDataError;
	}
	else {
		patbpData = "<p class='w3-tiny'>Blood Pressure request returns no results.</p>";
	}	

	document.getElementById("patbpData").innerHTML = patbpData;		
					
	return;	
	
};

//ht and wt logic is different than the rest. The reason being both height and weight were coming in separate entries. In order to align them based on same date time, had to create arrays. However, with old logic the array was not aligning well, so had to populate the table after everything was done at the bottom.
function populatehtwt(atoken, url){	
	
	var htwtTableData = "";
	var heightweightdttm = "";
	var height = "";
	var heightunit = "";
	var weight = "";
	var weightunit = "";
	var htwttablepopulated = false;
	var pathtwtData = "";
	var pathtwtDataError = "";
	var htwtCnt = 0;
	var htwtdttmarray = [];
	var htarray = [];
	var wtarray = [];
	var htwtstatusarray = [];
					
	var popvitals;
	
	do {	
		var nextpagefound = false;
				
		popvitals = {
			url: url,
			type: "GET",
			dataType: "json",
			async: false,
			headers: {
				"Accept": "application/json+fhir",
				"Authorization": "Bearer " + atoken			
			}
		};	
			
		$.ajax(popvitals).
			done(function(vit, textStatus, jqXHR){
				if (vit){
					//console.log(JSON.stringify(vit));
					if (vit.entry){
						var entry = vit.entry;
						entry.forEach(function(vitdata){
							
							if (vitdata.resource.status && vitdata.resource.status != "entered-in-error"){
								if (vitdata.resource.effectiveDateTime){
									
									//decrement the array to postion both height and weight together based on datetime.
									if (heightweightdttm === formatdttm(vitdata.resource.effectiveDateTime)){									
										htwtCnt--;																		
									}
									
									//get date time
									heightweightdttm = formatdttm(vitdata.resource.effectiveDateTime);
									htwtdttmarray[htwtCnt] = heightweightdttm;
									
									//get height							
									if (vitdata.resource.code && vitdata.resource.code.text === "Height/Length Measured"){
										if (vitdata.resource.valueQuantity && vitdata.resource.valueQuantity.value && vitdata.resource.valueQuantity.unit){									
											height = vitdata.resource.valueQuantity.value;
											heightunit = vitdata.resource.valueQuantity.unit;
											htarray[htwtCnt] = height + heightunit;									
										}								
									}
									//get weight							
									//if (vitdata.resource.code && vitdata.resource.code.text === "Weight Measured"){
									if (vitdata.resource.code && (vitdata.resource.code.text === "Weight Measured" || vitdata.resource.code.text === "Weight Dosing")){
										if (vitdata.resource.valueQuantity && vitdata.resource.valueQuantity.value && vitdata.resource.valueQuantity.unit){									
											weight = vitdata.resource.valueQuantity.value;
											weightunit = vitdata.resource.valueQuantity.unit;	
											wtarray[htwtCnt] = weight + weightunit										
										}								
									}
									
									//get status
									if (vitdata.resource.status){
										htwtstatus = vitdata.resource.status;
										htwtstatusarray[htwtCnt] = htwtstatus;
									}
									
									htwtCnt++;	
								}							
							}						
						})					
					}
					
					//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
					if (vit.link){
						var vitlink = vit.link;
						vitlink.forEach(function(vitlinkdata){						
							if (vitlinkdata.relation && vitlinkdata.relation === "next"){
								url = vitlinkdata.url;
								nextpagefound = true;
							}						
						})								
					}							
				}				
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				pathtwtDataError = "<br>Error retrieving Height and Weight - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
				console.log("Error retrieving Height and Weight - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);				
			});	
	
	}
	while (nextpagefound === true);
	
	//populate table
	if (htwtdttmarray.length > 0){						
		for (i=0; i < htwtdttmarray.length; i++){
			if (typeof(htarray[i]) == 'undefined'){
				htarray[i] = "";
			}
			if (typeof(wtarray[i]) == 'undefined'){
				wtarray[i] = "";
			}						
			htwtTableData += "<tr><td>" + htarray[i] + "</td><td>" + wtarray[i] + "</td><td>" + htwtdttmarray[i] + "</td><td>" + htwtstatusarray[i] + "</td></tr>";
			htwttablepopulated = true;							
		}						
	}
					
	//populate ht wt in the front-end
	//if table populated, post table, if failed ajax call then show pathtwtDataError, othewise go to else part.
	if (htwttablepopulated === true){
		pathtwtData = "<tr><th>Height</th><th>Weight</th><th>Date</th><th>Status</th></tr>" + htwtTableData;
	}
	else if (pathtwtDataError){
		pathtwtData = pathtwtDataError;
	}
	else {
		pathtwtData = "<p class='w3-tiny'>Height and Weight request returns no results.</p>";
	}								
	
	document.getElementById("pathtwtData").innerHTML = pathtwtData;
	
	return;	
	
};

function populateLabs(atoken, url){
		
	var labTableData = "";	
	var laboratoryCnt = 0;	
	var patlabsData = "";
	var patlabsDataError = "";
	
	var labtest = "";
	var labtestinterpretation = "";
	var labteststatus = "";
	var labtestdate = "";
	var labresultvalue = "";
	var labresultunit = "";
	var lablowrefrangevalue = "";
	var lablowrefrangeunit = "";
	var labhighrefrangevalue = "";
	var labhighrefrangeunit = "";
	var labloinccode = "";
	
	var labtablepopulated = false;
		
	var poplabs = "";

	do {	
		var nextpagefound = false;
		
		poplabs = {
			url: url,
			type: "GET",
			dataType: "json",
			async: false,
			headers: {
				"Accept": "application/json+fhir",
				"Authorization": "Bearer " + atoken			
			}
		};	
			
		$.ajax(poplabs).
			done(function(labs, textStatus, jqXHR){
				//console.log(JSON.stringify(labs));			
				if (labs){
					if (labs.entry){
						var entry = labs.entry;
						entry.forEach(function(labsdata){						
							if (labsdata.resource.category){												
								if (labsdata.resource.category.text && labsdata.resource.category.text === "Laboratory"){						
									//labtest = "";
									if (labsdata.resource.code.text){ 								
										labtest = labsdata.resource.code.text;
										labTableData += "<tr><td>" + labtest + "</td>";
										labtablepopulated = true;
										
										if (labsdata.resource.code && labsdata.resource.code.coding){
											var labscodecoding = labsdata.resource.code.coding;
											labscodecoding.forEach(function(labscodecodingdata){
												if (labscodecodingdata.system === "http://loinc.org"){;
													labloinccode = labscodecodingdata.code;
													labTableData += "<td>" + labloinccode + "</td>";
												}
												else {
													labTableData += "<td></td>";
												}											
											})											
										}
										else {
											labTableData += "<td></td>";
										}
										
										if (labsdata.resource.referenceRange){
											var refrange = labsdata.resource.referenceRange;
											refrange.forEach(function(refrangedata){
												if (refrangedata.low && refrangedata.high){
													//lablowrefrangevalue = "";
													//lablowrefrangeunit = "";
													//labhighrefrangevalue = "";
													//labhighrefrangeunit  = "";
													if (refrangedata.low.value && refrangedata.high.value && refrangedata.low.unit && refrangedata.high.unit){
														
														lablowrefrangevalue = refrangedata.low.value;
														lablowrefrangeunit = refrangedata.low.unit;									
														labhighrefrangevalue = refrangedata.high.value;
														labhighrefrangeunit = refrangedata.high.unit;
														
														labTableData += "<td>" + lablowrefrangevalue + " - " + labhighrefrangevalue + " " + labhighrefrangeunit + "</td>";
													}
													else {
														labTableData += "<td></td>";
													}
												}
												else {
													labTableData += "<td></td>";
												}
											})
										}
										else {
											labTableData += "<td></td>";
										}
										
										labresultvalue = "";
										if (labsdata.resource.valueQuantity && labsdata.resource.valueQuantity.value){
											labresultvalue = labsdata.resource.valueQuantity.value;									
										}
										else if (labsdata.resource.valueCodeableConcept && labsdata.resource.valueCodeableConcept.text){
											labresultvalue = labsdata.resource.valueCodeableConcept.text;									
										}
										else if (labsdata.resource.valueString){
											labresultvalue = labsdata.resource.valueString;									
										}
										
										labresultunit = "";
										if (labsdata.resource.valueQuantity && labsdata.resource.valueQuantity.unit) {
											labresultunit = labsdata.resource.valueQuantity.unit;	
										}
										if (labresultvalue && labresultunit){
											if ((labresultvalue >= lablowrefrangevalue) && (labresultvalue <= labhighrefrangevalue)){
											labTableData += "<td><b>" + labresultvalue + "</b><i> " + labresultunit + "</i></td>";
											}
											else {
											labTableData += "<td class='w3-text-dark-grey'><b>" + labresultvalue + "</b><i> " + labresultunit + "</i></td>";
											}
										}
										else if (labresultvalue > "" && labresultunit == ""){
											if ((labresultvalue >= lablowrefrangevalue) && (labresultvalue <= labhighrefrangevalue)){
												labTableData += "<td><b>" + labresultvalue + "</b></td>";
											}
											else {
												labTableData += "<td class='w3-text-dark-grey'><b>" + labresultvalue + "</b></td>";
											}
										}
										else {
											labTableData += "<td></td>";
										}
										
										labtestinterpretation = "";
										if (labsdata.resource.interpretation){
											if (labsdata.resource.interpretation.coding){
												var interpcoding = labsdata.resource.interpretation.coding;
												interpcoding.forEach(function(interpcodingdata){
													if (interpcodingdata.display){
														labtestinterpretation = interpcodingdata.display;
														if (labtestinterpretation === "Abnormal" || labtestinterpretation === "Low" || 	labtestinterpretation === "High"){
															labTableData += "<td class='w3-text-red'>" + labtestinterpretation + "</td>";
														}
														else {
															labTableData += "<td>" + labtestinterpretation + "</td>";
														}
													}
												})
											}
											else if (labsdata.resource.interpretation.text){
												labtestinterpretation = labsdata.resource.interpretation.text;
												if (labtestinterpretation === "Abnormal" || labtestinterpretation === "Low" || labtestinterpretation === "High"){
													labTableData += "<td class='w3-text-red'>" + labtestinterpretation + "</td>";
												}
												else {
													labTableData += "<td>" + labtestinterpretation + "</td>";
												}
											}
										}
										else {
											labTableData += "<td></td>";
										}
										
										//labteststatus = "";
										if (labsdata.resource.status){
											labteststatus = labsdata.resource.status;
											labTableData += "<td>" + labteststatus + "</td>";									
										}
										else {
											labTableData += "<td></td>";
										}
										
										//labtestdate = "";
										if (labsdata.resource.effectiveDateTime) {
											labtestdate = formatdttm(labsdata.resource.effectiveDateTime);
											labTableData += "<td>" + labtestdate + "</td></tr>";
										}
										else {
											labTableData += "<td></td></tr>";
										}
									laboratoryCnt++;	
									document.getElementById("laboratoryCnt").innerHTML = laboratoryCnt;
									}																
								}
							}					
						})						
					}
										
					//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
					if (labs.link){
						var lablink = labs.link;
						lablink.forEach(function(lablinkdata){						
							if (lablinkdata.relation && lablinkdata.relation === "next"){
								url = lablinkdata.url;
								nextpagefound = true;
							}						
						})								
					}						
				}								
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				patlabsDataError = "<br>Error retrieving labs - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
				console.log("Error retrieving labs - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);				
			});	
	}		
	while (nextpagefound === true);

	if (labtablepopulated === true){
		patlabsData = "<tr><th>Test</th><th>LOINC Code</th><th>Reference Range</th><th>Result Value <i>Units</i></th><th>Interpretation</th><th>Status</th><th>Date</th></tr>" + labTableData;							
	}
	else if (patlabsDataError){
		patlabsData = patlabsDataError;
	}
	else {
		patlabsData = "<p class='w3-tiny'>Labs request returns no results.</p>";						
	}
	
	document.getElementById("patlabsData").innerHTML = patlabsData;
	
	return 
	
};

function populateVitals(atoken, url){
	
	var pulseresultvalue = "";
	var pulseresultunit = "";
	var pulsetestdate = "";
	var pulsestatus = "";
	var pulseinterpretation = "";
	var pulselowrefrangevalue = "";
	var pulselowrefrangeunit = "";
	var pulsehighrefrangevalue = "";
	var pulsehighrefrangeunit = "";

	var pulseTableData = "";	
	var pulseCnt = 0;	
	var patpulseData = "";	
	var patpulseDataError = "";
	var pulsetablepopulated = false;
	
	var rrresultvalue = "";
	var rrresultunit = "";
	var rrtestdate = "";
	var rrstatus = "";
	var rrinterpretation = "";
	var rrlowrefrangevalue = "";
	var rrlowrefrangeunit = "";
	var rrhighrefrangevalue = "";
	var rrhighrefrangeunit = "";
	
	var rrTableData = "";	
	var rrCnt = 0;	
	var patrrData = "";	
	var patrrDataError = "";	
	var rrtablepopulated = false;
		
	var popvitals2 = "";

	do {	
		var nextpagefound = false;
		
		popvitals2 = {
			url: url,
			type: "GET",
			dataType: "json",
			async: false,
			headers: {
				"Accept": "application/json+fhir",
				"Authorization": "Bearer " + atoken			
			}
		};	
			
		$.ajax(popvitals2).
			done(function(vitals, textStatus, jqXHR){
				//console.log(JSON.stringify(vitals));			
				if (vitals){
					if (vitals.entry){
						var entry = vitals.entry;
						entry.forEach(function(vitalsdata){						
							if (vitalsdata.resource.code && vitalsdata.resource.code.text && vitalsdata.resource.code.text === "Pulse"){	
										
								//pulse result value								
								if ((vitalsdata.resource.valueQuantity && vitalsdata.resource.valueQuantity.value) && (vitalsdata.resource.valueQuantity && vitalsdata.resource.valueQuantity.unit)) {
									pulseresultvalue = vitalsdata.resource.valueQuantity.value;	
									pulseresultunit = vitalsdata.resource.valueQuantity.unit;
									pulseTableData += "<tr><td>" + pulseresultvalue + " " + pulseresultunit + "</td>";
									pulsetablepopulated = true;
									
									//reference range
									if (vitalsdata.resource.referenceRange){
										var refrange = vitalsdata.resource.referenceRange;
										refrange.forEach(function(refrangedata){
											if (refrangedata.low && refrangedata.high){													
												if (refrangedata.low.value && refrangedata.high.value && refrangedata.low.unit && refrangedata.high.unit){
															
													pulselowrefrangevalue  = refrangedata.low.value;
													pulselowrefrangeunit  = refrangedata.low.unit;									
													pulsehighrefrangevalue  = refrangedata.high.value;
													pulsehighrefrangeunit  = refrangedata.high.unit;
														
													pulseTableData += "<td>" + pulselowrefrangevalue  + " - " + pulsehighrefrangevalue  + " " + pulsehighrefrangeunit  + "</td>";
												}
												else {
													pulseTableData += "<td></td>";
												}
											}
											else {
												pulseTableData += "<td></td>";
											}
										})
									}
									else {
										pulseTableData += "<td></td>";
									}
											
									//interpretation
									pulseinterpretation = "";
									if (vitalsdata.resource.interpretation){
										if (vitalsdata.resource.interpretation.coding){
											var interpcoding = vitalsdata.resource.interpretation.coding;
											interpcoding.forEach(function(interpcodingdata){
												if (interpcodingdata.display){
													pulseinterpretation = interpcodingdata.display;
													if (pulseinterpretation === "Abnormal" || pulseinterpretation === "Low" || 	pulseinterpretation === "High" || pulseinterpretation === "Off scale high"){
														pulseTableData += "<td class='w3-text-red'>" + pulseinterpretation + "</td>";
													}
													else {
														pulseTableData += "<td>" + pulseinterpretation + "</td>";
													}
												}
											})
										}
										else if (vitalsdata.resource.interpretation.text){
											pulseinterpretation = vitalsdata.resource.interpretation.text;
											if (pulseinterpretation === "Abnormal" || pulseinterpretation === "Low" || pulseinterpretation === "High" || pulseinterpretation === "Off scale high"){
												pulseTableData += "<td class='w3-text-red'>" + pulseinterpretation + "</td>";
											}
											else {
												pulseTableData += "<td>" + pulseinterpretation + "</td>";
											}
										}
									}
									else {
										pulseTableData += "<td></td>";
									}
																			
									if (vitalsdata.resource.status){
										pulsestatus = vitalsdata.resource.status;
										pulseTableData += "<td>" + pulsestatus + "</td>";									
									}
									else {
										pulseTableData += "<td></td>";
									}										
										
									if (vitalsdata.resource.effectiveDateTime) {
										pulsetestdate = formatdttm(vitalsdata.resource.effectiveDateTime);
										pulseTableData += "<td>" + pulsetestdate + "</td></tr>";
									}
									else {
										pulseTableData += "<td></td></tr>";
									}
										
									pulseCnt++;									
								}																		
							}

							//get Respiratory Rate
							if (vitalsdata.resource.code && vitalsdata.resource.code.text && vitalsdata.resource.code.text === "Respiratory Rate"){	
										
								//rr result value								
								if ((vitalsdata.resource.valueQuantity && vitalsdata.resource.valueQuantity.value) && (vitalsdata.resource.valueQuantity && vitalsdata.resource.valueQuantity.unit)) {
									rrresultvalue = vitalsdata.resource.valueQuantity.value;	
									rrresultunit = vitalsdata.resource.valueQuantity.unit;
									rrTableData += "<tr><td>" + rrresultvalue + " " + rrresultunit + "</td>";
									rrtablepopulated = true;
									
									//reference range
									if (vitalsdata.resource.referenceRange){
										var refrange = vitalsdata.resource.referenceRange;
										refrange.forEach(function(refrangedata){
											if (refrangedata.low && refrangedata.high){													
												if (refrangedata.low.value && refrangedata.high.value && refrangedata.low.unit && refrangedata.high.unit){
															
													rrlowrefrangevalue  = refrangedata.low.value;
													rrlowrefrangeunit  = refrangedata.low.unit;									
													rrhighrefrangevalue  = refrangedata.high.value;
													rrhighrefrangeunit  = refrangedata.high.unit;
														
													rrTableData += "<td>" + rrlowrefrangevalue  + " - " + rrhighrefrangevalue  + " " + rrhighrefrangeunit  + "</td>";
												}
												else {
													rrTableData += "<td></td>";
												}
											}
											else {
												rrTableData += "<td></td>";
											}
										})
									}
									else {
										rrTableData += "<td></td>";
									}
											
									//interpretation
									rrinterpretation = "";
									if (vitalsdata.resource.interpretation){
										if (vitalsdata.resource.interpretation.coding){
											var interpcoding = vitalsdata.resource.interpretation.coding;
											interpcoding.forEach(function(interpcodingdata){
												if (interpcodingdata.display){
													rrinterpretation = interpcodingdata.display;
													if (rrinterpretation === "Abnormal" || rrinterpretation === "Low" || 	rrinterpretation === "High" || rrinterpretation === "Off scale high"){
														rrTableData += "<td class='w3-text-red'>" + rrinterpretation + "</td>";
													}
													else {
														rrTableData += "<td>" + rrinterpretation + "</td>";
													}
												}
											})
										}
										else if (vitalsdata.resource.interpretation.text){
											rrinterpretation = vitalsdata.resource.interpretation.text;
											if (rrinterpretation === "Abnormal" || rrinterpretation === "Low" || rrinterpretation === "High" || rrinterpretation === "Off scale high"){
												rrTableData += "<td class='w3-text-red'>" + rrinterpretation + "</td>";
											}
											else {
												rrTableData += "<td>" + rrinterpretation + "</td>";
											}
										}
									}
									else {
										rrTableData += "<td></td>";
									}
																			
									if (vitalsdata.resource.status){
										rrstatus = vitalsdata.resource.status;
										rrTableData += "<td>" + rrstatus + "</td>";									
									}
									else {
										rrTableData += "<td></td>";
									}										
										
									if (vitalsdata.resource.effectiveDateTime) {
										rrtestdate = formatdttm(vitalsdata.resource.effectiveDateTime);
										rrTableData += "<td>" + rrtestdate + "</td></tr>";
									}
									else {
										rrTableData += "<td></td></tr>";
									}
										
									rrCnt++;									
								}																		
							}				
						})						
					}
										
					//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
					if (vitals.link){
						var vitalslink = vitals.link;
						vitalslink.forEach(function(vitalslinkdata){						
							if (vitalslinkdata.relation && vitalslinkdata.relation === "next"){
								url = vitalslinkdata.url;
								nextpagefound = true;
							}						
						})								
					}						
				}			
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				patpulseDataError = "<br>Error retrieving Pulse information - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
				patrrDataError = "<br>Error retrieving Respiratory Rate information - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;
				console.log("Error retrieving Pulse and RR - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);
			});	
	}		
	while (nextpagefound === true);
	
	//populate pulse
	if (pulsetablepopulated === true){
		patpulseData = "<tr><th>Pulse</th></th><th>Reference Range</th><th>Interpretation</th><th>Status</th><th>Date</th></tr>" + pulseTableData;						
	}
	else if (patpulseDataError){
		patpulseData = patpulseDataError;
	}
	else {
		patpulseData = "<p class='w3-tiny'>Pulse request returns no results.</p>";						
	}
						
	//populate RR
	if (rrtablepopulated === true){
		patrrData = "<tr><th>Respiratory Rate</th></th><th>Reference Range</th><th>Interpretation</th><th>Status</th><th>Date</th></tr>" + rrTableData;						
	}
	else if (patrrDataError){
		patrrData = patrrDataError;
	}
	else {
		patrrData = "<p class='w3-tiny'>Respiratory Rate request returns no results.</p>";						
	}
						
	document.getElementById("patpulseData").innerHTML = patpulseData;
	document.getElementById("patrrData").innerHTML = patrrData;
				
	return; 
	
};

function getDiagnosticReportURLs(atoken, url){	
			
	var radTableData = "";
	var radreportheader = "";
	var radreportstatus = "";
	var radreportdate = "";
	var radreportperformer = "";
	var radreporturl = "";	
	var radtablepopulated = false;
	
	var radrpcontent = "";
		
	var radiologyCnt = 0;
	var patradreportData = "";
	var patradreportDataError = "";
	
	var getdiagurls;
	
	do {	
		var nextpagefound = false;
						
		getdiagurls = {
			url: url,
			type: "GET",
			async: false,
			dataType: "json",
			headers: {
				"Accept": "application/json+fhir",
				"Authorization": "Bearer " + atoken			
			}
		};	
			
		$.ajax(getdiagurls).
			done(function(diagx, textStatus, jqXHR){
				//console.log(JSON.stringify(diagx));			
				if (diagx){
					if (diagx.entry){
						var entry = diagx.entry;
						
						entry.forEach(function(diagdata){	
							if (diagdata.resource.status && diagdata.resource.status != "entered-in-error"){
							if ((diagdata.resource.category) && (diagdata.resource.category.coding)){
								var diagcatcoding = diagdata.resource.category.coding;
								diagcatcoding.forEach(function(diagcatcodingdata){
									if (diagcatcodingdata.code === "RAD"){					
						
										radreportheader = "";
										if ((diagdata.resource.text) && (diagdata.resource.text.div)){
											
											radreportheader = diagdata.resource.text.div;
											var origradreportheader = radreportheader;
											var strlength = radreportheader.length;
											var documentTitlestartpos = radreportheader.search("Document Title</b>:"); //gave 77th position where this strings starts at.
											radreportheader = radreportheader.substring(documentTitlestartpos + 20, strlength);
											var documentTitleendpos = radreportheader.search("</"); 
											radreportheader = radreportheader.substring(0, documentTitleendpos);
											radtablepopulated = true;
											
											radreportstatus = "";
											if (diagdata.resource.status) {
												radreportstatus = diagdata.resource.status;							
											}
																	
											radreportdate = "";
											if (diagdata.resource.effectiveDateTime) {
												radreportdate = formatdttm(diagdata.resource.effectiveDateTime);
											}
																	
											radreportperformer = "";
											if ((diagdata.resource.performer) && (diagdata.resource.performer.display)) {
												radreportperformer = diagdata.resource.performer.display;											
											}
																	
											radreporturl = "";
											if (diagdata.resource.presentedForm){
												var presentedForm = diagdata.resource.presentedForm;									
												presentedForm.forEach(function(presentformdata){ 
													if (presentformdata.contentType && presentformdata.contentType === "text/html"){			
														if (presentformdata.url){
															radreporturl = presentformdata.url;												
															
															////////////////
															//get rad report	
															////////////////
															var radreportoptions
															radreportoptions = {
																url: radreporturl,
																type: "GET",
																async: false,
																dataType: "json",
																headers: {
																	"Accept": "application/json+fhir",
																	"Authorization": "Bearer " + atoken			
																}
															};	
															
															//second ajax call to get report
															$.ajax(radreportoptions).
																done(function(radrp, textStatus, jqXHR){
																	//console.log(JSON.stringify(radrp));			
																	if (radrp){
																		radrpcontent = "";
																		if (radrp.content){
																			
																			radrpcontent = radrp.content;
																																		
																			radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td><a href='index' onclick='return false;'><i class='material-icons' style='font-size:18px; color:grey;' onclick='showRadReport(\"" + radreportheader + "\"" + ", " + "\"" + radrpcontent + "\"" + ", " + "\"" + origradreportheader + "\") '>&#xe85d;</i></a></td></tr>";			
																			
																			radiologyCnt++;
																			document.getElementById("radiologyCnt").innerHTML = radiologyCnt;	
																		}
																		else {
																			radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
																		}
																	}
																	else {
																		radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
																	}
																})													
																.fail(function(jqXHR, textStatus, errorThrown){	
																console.log("Error retrieving radiology report: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);	
																});													
																//second ajax call to get report ends
														}
														else {
															radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
														}
													}										
												})
											}
											else {
												radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
											}
										}	
									}
								})								
							}						
								
							else if ((diagdata.resource.category) && (diagdata.resource.category.text) && (diagdata.resource.category.text === "RADRPT" || diagdata.resource.category.text === "CT Report")){
						
								radreportheader = "";
								if ((diagdata.resource.text) && (diagdata.resource.text.div)){
									
									radreportheader = diagdata.resource.text.div;
									var origradreportheader = radreportheader;
									var strlength = radreportheader.length;
									var documentTitlestartpos = radreportheader.search("Document Title</b>:"); //gave 77th position where this strings starts at.
									radreportheader = radreportheader.substring(documentTitlestartpos + 20, strlength);
									var documentTitleendpos = radreportheader.search("</"); 
									radreportheader = radreportheader.substring(0, documentTitleendpos);
									radtablepopulated = true;
									
									radreportstatus = "";
									if (diagdata.resource.status) {
										radreportstatus = diagdata.resource.status;							
									}
															
									radreportdate = "";
									if (diagdata.resource.effectiveDateTime) {
										radreportdate = formatdttm(diagdata.resource.effectiveDateTime);
									}
															
									radreportperformer = "";
									if ((diagdata.resource.performer) && (diagdata.resource.performer.display)) {
										radreportperformer = diagdata.resource.performer.display;											
									}
															
									radreporturl = "";
									if (diagdata.resource.presentedForm){
										var presentedForm = diagdata.resource.presentedForm;									
										presentedForm.forEach(function(presentformdata){ 
											if (presentformdata.contentType && presentformdata.contentType === "text/html"){			
												if (presentformdata.url){
													radreporturl = presentformdata.url;												
													
													////////////////
													//get rad report	
													////////////////
													var radreportoptions
													radreportoptions = {
														url: radreporturl,
														type: "GET",
														async: false,
														dataType: "json",
														headers: {
															"Accept": "application/json+fhir",
															"Authorization": "Bearer " + atoken			
														}
													};	
													
													//second ajax call to get report
													$.ajax(radreportoptions).
														done(function(radrp, textStatus, jqXHR){
															//console.log(JSON.stringify(radrp));			
															if (radrp){
																radrpcontent = "";
																if (radrp.content){
																	
																	radrpcontent = radrp.content;
																																
																	radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td><a href='index' onclick='return false;'><i class='material-icons' style='font-size:18px; color:grey;' onclick='showRadReport(\"" + radreportheader + "\"" + ", " + "\"" + radrpcontent + "\"" + ", " + "\"" + origradreportheader + "\") '>&#xe85d;</i></a></td></tr>";			
																	
																	radiologyCnt++;
																	document.getElementById("radiologyCnt").innerHTML = radiologyCnt;
																}
																else {
																	radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
																}
															}
															else {
																radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
															}
														})													
														.fail(function(jqXHR, textStatus, errorThrown){	
														console.log("Error retrieving radiology report: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);	
														});													
														//second ajax call to get report ends
												}
												else {
													radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
												}
											}										
										})
									}
									else {
										radTableData += "<tr><td>" + radreportheader + "</td><td>" + radreportstatus + "</td><td>" + radreportdate + "</td><td>" + radreportperformer + "</td><td></td></tr>";	
									}
								}							
							}
							}
						})						
					}
					else{
						patradreportData = "<p class='w3-tiny'>Radiology request returns no results.</p>";
					}
					
					//paging check - get the next URL and call ajax in synchronized state to start populating data from next URL.
					if (diagx.link){						
						var diagxlink = diagx.link;
						diagxlink.forEach(function(diagxlinkdata){						
							if (diagxlinkdata.relation && diagxlinkdata.relation === "next"){
								url = diagxlinkdata.url;
								nextpagefound = true;								
							}						
						})								
					}					
				}						
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				patradreportDataError = "<br>Error retrieving Diagnostic URLs - Error: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown;	
				console.log("Error retrieving Diagnostic URLs: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);							
			});			
	}	
	while (nextpagefound === true);	
	
	if (radtablepopulated === true){
		patradreportData = "<tr><th>Report Title</th><th>Status</th><th>Date</th><th>Performer</th><th>Report</th></tr>" + radTableData;
	}
	else if (patradreportDataError){
		patradreportData = patradreportDataError;
	}
	else{
		patradreportData = "<p class='w3-tiny'>Radiology request returns no results.</p>";
	}
	
	document.getElementById("patradreportData").innerHTML = patradreportData;	
						
	return;		
};


//date and time format function
function formatdttm(datetime){
	var formatDateTime = "",
	days = "",
	months = "",
	year = "",
	hours = "",
	ampm = "",
	minutes = "",
	seconds = "",
	NewFormattedDateTime = "";
	
	formatDateTime = new Date(datetime);
	days = formatDateTime.getDate();
	months = formatDateTime.getMonth() + 1;
	year = formatDateTime.getFullYear();
	hours = formatDateTime.getHours();
	//ampm = (hours > 11) ? "PM" : "AM";
	if (months < 10) {
		months = '0' + months;
	} 
	else {
		months = months + '';
	}
	
	if (days < 10) {
		days = '0' + days;
	}
	else {
		days = days + '';
	}
	/*
	if(hours > 12) {
		hours -= 12;
	}
	else if(hours == 0) {
		hours = "12";
	}
	*/
	if (hours < 10) {
		hours = '0' + hours;
	} 
	else {
		hours = hours + '';
	}
							
	minutes = formatDateTime.getMinutes();
	if (minutes < 10) {
		minutes = '0' + minutes;
	} 
	else {
		minutes = minutes + '';
	}

	seconds = formatDateTime.getSeconds();
	if (seconds < 10) {
		seconds = '0' + seconds;
	} 
	else {
		seconds = seconds + '';
	}
											
	//NewFormattedDateTime = year + "-" + months + "-" + days + " " + hours + ":" + minutes + ":" + seconds + " " + ampm + "CST";	
	NewFormattedDateTime = year + "-" + months + "-" + days + " " + hours + ":" + minutes + ":" + seconds + " " + "CST";
    return NewFormattedDateTime;
}

function getUrlParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
        {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            var res = sParameterName[1].replace(/\+/g, '%20');
            return decodeURIComponent(res);
        }
    }
}

function AddMedicationStatement(){
	
	var medsurl2 = serviceUri + "/MedicationStatement?patient=" + patientId + "&_count=100";

	var medicationstatementdata = "";
	
	var postmedstatementurl = serviceUri + "/MedicationStatement";
	
	//medication code, display or freetext handling
	var meddata = null
	var amsmeddisplay = "";
	var amsmedRXNcode = "";	
	var amsmedicationfreetext = "";
	if (document.getElementById("msmedication").value){		
		var medicationValue = document.getElementById("msmedication").value;
		var medPos = medicationValue.search("-RXNormCode=");
		amsmeddisplay = medicationValue.substring(0,medPos);
		amsmedRXNcode = medicationValue.substring(medPos + 12);
		
		meddata = {
			"coding": [
			  {
				"system": "http://www.nlm.nih.gov/research/umls/rxnorm",
				 "code": amsmedRXNcode,
				 "display": amsmeddisplay,
				 "userSelected": false
			  }
			]
		  };
	}
	//free text medication	
	else if (document.getElementById("msmedicationfreetext").value){		
		amsmedicationfreetext = document.getElementById("msmedicationfreetext").value;
		meddata = {
			"text": amsmedicationfreetext
		  };
	}
	
	//dosage route handling
	var amsdosageroutedisplay = "";
	var amsdosageroutecode = "";
	if (document.getElementById("dosageroute").value){
		var dosageRouteValue = document.getElementById("dosageroute").value;
		var dosageroutePos = dosageRouteValue.search("-SNOMEDCode=");
		amsdosageroutedisplay = dosageRouteValue.substring(0,dosageroutePos);
		amsdosageroutecode = dosageRouteValue.substring(dosageroutePos + 12);	
	}	
	dosageroutedata = null;
	if (amsdosageroutedisplay && amsdosageroutecode){
		dosageroutedata = {
				"coding": [
				  {
					"system": "http://snomed.info/sct",
                    "code": amsdosageroutecode,
                    "display": amsdosageroutedisplay,
                    "userSelected": false
				  }
				]
			  };
	}
	
	//status
	var amsstatus = document.getElementById("msstatus").value;
	
	//start date time
	var amseffectiveperiodstart = null;
	if (document.getElementById("mseffectiveperiodstart").value){
		amseffectiveperiodstart = document.getElementById("mseffectiveperiodstart").value;
	}
	
	//end date time
	var amseffectiveperiodend = null;
	if (document.getElementById("mseffectiveperiodend").value){
		amseffectiveperiodend = document.getElementById("mseffectiveperiodend").value;	
	}
	
	//dosage timing handling
	dosagetimingdata = null;
	var amsdosagetiming = "";
	if (document.getElementById("dosagetiming").value){
		amsdosagetiming = document.getElementById("dosagetiming").value;
	}
	if (amsdosagetiming){
		dosagetimingdata = {
				"code": {				
				  "coding": [
					{
					  "system": "http://hl7.org/fhir/timing-abbreviation",
					  "code": amsdosagetiming,
					  "display": amsdosagetiming,
					  "userSelected": false
					},
					{
					  "system": "http://hl7.org/fhir/v3/GTSAbbreviation",
					  "code": amsdosagetiming,
					  "display": amsdosagetiming,
					  "userSelected": false
					}
				  ]				 
				}
			  };
	}
	
	//quantity data handling
	var quantitydata = null;	
	var amsdosagequantity = "";
	var amsdosagequantityunit = "";
	//quantity
	if (document.getElementById("dosagequantity").value){
		amsdosagequantity = document.getElementById("dosagequantity").value;
	}
	//quantity unit	
	if (document.getElementById("dosagequantityunit").value){
		amsdosagequantityunit = document.getElementById("dosagequantityunit").value;
	}
	if (amsdosagequantity || amsdosagequantity){
		quantitydata = {
				"value": amsdosagequantity,
				"unit": amsdosagequantityunit,
				"system": "http://unitsofmeasure.org",
				"code": amsdosagequantityunit
			  };
	}
	
	//start creacting JSON
	if ((amsmeddisplay && amsmedRXNcode) || amsmedicationfreetext){ 	
		
		medicationstatementdata = 
		{
		  "resourceType": "MedicationStatement",  
		  "patient": {
			"reference": "Patient/" + patientId
		  },
		  "status": amsstatus,   
		  "effectivePeriod": {
			"start": amseffectiveperiodstart,
			"end": amseffectiveperiodend
		  },
		  "medicationCodeableConcept": meddata,  
		  "dosage": [
			{			  		 
			  "timing": dosagetimingdata,
			  "route": dosageroutedata,
			  "quantityQuantity": quantitydata
			}
		  ]
		};
		
	}
		
	if (medicationstatementdata){
				
		medicationstatementdata = JSON.stringify(medicationstatementdata); // this converts javascript object to json string
		//medicationstatementdata = JSON.parse(medicationstatementdata); //this converts json string to javascript object
		//console.log(medicationstatementdata);
				
		var postmedstatement;
	
		postmedstatement = {
			url: postmedstatementurl,
			type: "POST",
			dataType: "text", 
			//added this "dataType: "text"" otherwise, the resource was getting created, but was going in the fail section with error "Error posting Med Statement: parsererror, Status Code: 201, Error Thrown: SyntaxError: Unexpected end of JSON input".
			// the reason was with data type json you cannot send "" values, those have to be null. if you change it to text then it works fine.
			data: medicationstatementdata,
			headers: {
				"Authorization": "Bearer " + accessToken,
				"Accept": "application/json+fhir",			
				"Content-Type": "application/json+fhir"
			}
		};	
			
		$.ajax(postmedstatement).
			done(function(medstatement, textStatus, jqXHR){
				if (textStatus == "success"){
					console.log("Resource successfully created");
					alert(amsmeddisplay + amsmedicationfreetext + " - med statement successfully added to Cerner record");
					populateMedications(accessToken, medsurl2);
				}
				else {
					console.log(textStatus);
					alert("Failed to add Med Statement to Cerner record");
				}							
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				console.log("Error posting Med Statement: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);					
			});		
	}
	
	return;
}	

function AddAllergy(){
	
	var allurl2 = serviceUri + "/AllergyIntolerance?patient=" + patientId;
	
	var allergydata = "";
	
	var postallergyurl = serviceUri + "/AllergyIntolerance";
	
	//medication code, display or freetext handling
	var substancedata = null
	var substancedisplay = "";
	var substanceRXNcode = "";	
	var substancefreetext = "";
	if (document.getElementById("aasubstance").value){		
		var aasubstanceValue = document.getElementById("aasubstance").value;
		var substancePos = aasubstanceValue.search("-RXNormCode=");
		substancedisplay = aasubstanceValue.substring(0,substancePos);
		substanceRXNcode = aasubstanceValue.substring(substancePos + 12);
		
		substancedata = {
			"coding": [
			  {
				"system": "http://www.nlm.nih.gov/research/umls/rxnorm",
				 "code": substanceRXNcode,
				 "display": substancedisplay,
				 "userSelected": false
			  }
			]
		  };
	}
	//free text medication	
	else if (document.getElementById("aasubstancefreetext").value){		
		substancefreetext = document.getElementById("aasubstancefreetext").value;
		substancedata = {
			"text": substancefreetext
		  };
	}
	
	//reporter
	//var addallreporter = document.getElementById("aareporter").value;
			
	//recorded date time
	var addallrecordeddatetime = new Date(); //document.getElementById("aarecordeddate").value;
	
	//status
	var addallstatus = document.getElementById("aastatus").value;
	
	//criticality
	var addallcriticality = document.getElementById("aacriticality").value;
	
	//category
	var addallcategory = document.getElementById("aacategory").value;
	
	//type
	var addallergytype = null;
	addallergytype = document.getElementById("aatype").value;
	
	//reaction
	var addallergyreaction = null;
	if (document.getElementById("aareaction").value){
		var addallergyreactiondata = document.getElementById("aareaction").value;
	
		addallergyreaction = [
				{
				  "manifestation": [
					{
					  "text": addallergyreactiondata //"Hives"
					}
				  ]
				}
			  ];
	}
		
	//start creacting JSON
	if ((substancedisplay && substanceRXNcode) || substancefreetext){ 	
		
		allergydata = 
		{
		  "resourceType": "AllergyIntolerance",
		  "category": addallcategory, //food, medication, environment, other
		  "criticality": addallcriticality, //CRITL, CRITH, CRITU (low risk, high risk, unable to determine)
		  "recordedDate": addallrecordeddatetime, //"2018-04-08T14:21:00-06:00",
		  "status": addallstatus, //"active", //active, unconfirmed, confirmed, inactive, resolved, refuted, entered-in-error
		  "type": addallergytype, // "allergy", //allergy, intolerance
		  "patient": {
			"reference": "Patient/" + patientId //4342008"
		  },
		  "reporter": {
			"reference": "Patient/" + patientId //4342008"
		  },
		  // reaction had to be hard coded to Not unknown because free text reaction is part if manifestion which is a required field. Otherwise if snomed raction is sent then we don't have to hard code anything. 
		  "reaction": addallergyreaction,
		  "substance": substancedata // "Drug Allergy"
		  	  
		};
		
	}
		
	if (allergydata){
				
		allergydata = JSON.stringify(allergydata); // this converts javascript object to json string
		//allergydata = JSON.parse(allergydata); //this converts json string to javascript object
		//console.log(allergydata);
				
		var postallergy;
	
		postallergy = {
			url: postallergyurl,
			type: "POST",
			dataType: "text", 
			//added this "dataType: "text"" otherwise, the resource was getting created, but was going in the fail section with error "Error posting Med Statement: parsererror, Status Code: 201, Error Thrown: SyntaxError: Unexpected end of JSON input".
			// the reason was with data type json you cannot send "" values, those have to be null. if you change it to text then it works fine.
			data: allergydata,
			headers: {
				"Authorization": "Bearer " + accessToken,
				"Accept": "application/json+fhir",			
				"Content-Type": "application/json+fhir"
			}
		};	
			
		$.ajax(postallergy).
			done(function(addallergiesdata, textStatus, jqXHR){
				if (textStatus == "success"){
					console.log("Resource successfully created");
					alert(substancedisplay + substancefreetext + " - allergy successfully added or updated to Cerner patient record.");
					populateAllergies(accessToken, allurl2);
				}
				else {
					console.log(textStatus);
					alert("Failed to add Allergy to Cerner record");
				}							
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				console.log("Error posting Allergy: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);					
			});		
	}
	
	return;
}	

function AddDiagnosis(){
	
	var condurl2 = serviceUri + "/Condition?patient=" + patientId;
	
	var conditiondata = "";
	
	var postconditionurl = serviceUri + "/Condition";
	
	//diagnosis code, display or freetext handling
	var diagnosisdata = null
	var diagnosisdisplay = "";
	var diagnosisICD10code = "";	
	var diagnosisfreetext = "";
	if (document.getElementById("addiagnosis").value){		
		var addiagnosisValue = document.getElementById("addiagnosis").value;
		var diagnosisPos = addiagnosisValue.search("-ICD10=");
		diagnosisdisplay = addiagnosisValue.substring(0,diagnosisPos);
		diagnosisICD10code = addiagnosisValue.substring(diagnosisPos + 7);
		
		diagnosisdata = {
			"coding": [
			  {
				"system": "http://hl7.org/fhir/sid/icd-10-cm",
				 "code": diagnosisICD10code,
				 "display": diagnosisdisplay,
				 "userSelected": false
			  }
			]
		  };
	}
	//free text diagnosis	
	else if (document.getElementById("addiagnosisfreetext").value){		
		diagnosisfreetext = document.getElementById("addiagnosisfreetext").value;
		diagnosisdata = {
			"text": diagnosisfreetext
		  };
	}
	
	//category
	var diagnosiscategory = document.getElementById("adcategory").value;
	
	//recorded date time
	var diagnosisrecordeddatetime = new Date(); //document.getElementById("aarecordeddate").value;
	
	//verification status
	var diagnosisverificationstatus = document.getElementById("adverificationstatus").value;
	
	//clinical status
	var diagnosisclinicalstatus = null;
	if (document.getElementById("adclinicalstatus").value){
		diagnosisclinicalstatus = document.getElementById("adclinicalstatus").value;
	}
	
	//onset date time
	var diagnosisonsetdatetime = null;	
	if (document.getElementById("adonsetdatetime").value){		
		diagnosisonsetdatetime = document.getElementById("adonsetdatetime").value;		
	}
	
	//severity
	var diagnosisseverity = null;
	if (document.getElementById("adseverity").value){
		var diagnosisseveritydata = document.getElementById("adseverity").value;
		diagnosisseverity = {
			"text": diagnosisseveritydata
		};
	}
		
	//start creacting JSON
	if (diagnosisdata){ 	
		
		conditiondata = 	
		{
		  "resourceType": "Condition",
		  "patient": {
			"reference": "Patient/" + patientId //4342008"
		  },
		  "recordedDate": diagnosisrecordeddatetime, //"2018-04-08T14:21:00-06:00",
		  "code": diagnosisdata,				 
		  "category": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/condition-category",
                            "code": "diagnosis",
                            "display": "Diagnosis"
                        }
                    ],
                    "text": "Diagnosis"
                },				
		  "clinicalStatus": diagnosisclinicalstatus,
		  "verificationStatus": diagnosisverificationstatus,
		  "severity": diagnosisseverity,
          "onsetDateTime": diagnosisonsetdatetime,
		  "encounter": {
			"reference": "Encounter/" + encounterId
		  }
		};		
		
	}
		
	if (conditiondata){
				
		conditiondata = JSON.stringify(conditiondata); // this converts javascript object to json string
		//conditiondata = JSON.parse(conditiondata); //this converts json string to javascript object
		//console.log(conditiondata);
				
		var postallergy;
	
		postallergy = {
			url: postconditionurl,
			type: "POST",
			dataType: "text", 
			//added this "dataType: "text"" otherwise, the resource was getting created, but was going in the fail section with error "Error posting Med Statement: parsererror, Status Code: 201, Error Thrown: SyntaxError: Unexpected end of JSON input".
			// the reason was with data type json you cannot send "" values, those have to be null. if you change it to text then it works fine.
			data: conditiondata,
			headers: {
				"Authorization": "Bearer " + accessToken,
				"Accept": "application/json+fhir",			
				"Content-Type": "application/json+fhir"
			}
		};	
			
		$.ajax(postallergy).
			done(function(conditiondiagnosis, textStatus, jqXHR){
				if (textStatus == "success"){
					console.log("Resource successfully created");
					alert(diagnosisdisplay + diagnosisfreetext + " - diagnosis successfully added or updated to Cerner patient record.");
					populateConditions(accessToken, condurl2);
				}
				else {
					console.log(textStatus);
					alert("Failed to add Diagnosis to Cerner record");
				}							
			})	
			.fail(function(jqXHR, textStatus, errorThrown){	
				console.log("Error posting Diagnosis: " + textStatus + ", Status Code: " + jqXHR.status + ", Error Thrown: " + errorThrown);					
			});		
	}
	
	return;
}	

function AddOrder(){
		
	var procrequestdata = "";
	
	var orderidentifier = null;
	var orderidentifiervalue = Math.round(Math.random()*1000000).toString();	
	if (document.getElementById("ocode").value || document.getElementById("ofreetext").value){
		orderidentifier = [
				  {
					  "use": "official",
					  "type": {
						  "coding": [
							{
							  "system": "	http://hl7.org/fhir/identifier-type",
							  "code": "PLAC",
							  "display": "Placer Identifier",
							  "userSelected": false
							}
						  ],
						  "text": "Placer Identifier"
					  },
					  "system": "urn:oid:1.1.1.1.1.1",
					  "value": orderidentifiervalue				
				  }
			  ];
	}
	
	var orderrequisition = null;
	var orequisitiontext = "";
	if (document.getElementById("orequisition").value){
		orequisitiontext = document.getElementById("orequisition").value;
		
		orderrequisition = [
			  {
				  "use": "official",
				  "type": {
					"coding": [
						{
						  "system": "	http://hl7.org/fhir/identifier-type",
						  "code": "REQUISITION",
						  "display": "Order Requisition",
						  "userSelected": false
						}
					],
					"text": "Order Requisition"
				  },
				  "system": "urn:oid:1.1.1.1.1.1",
				  "value": orequisitiontext			
			  }
          ];
	}
		
	var orderstatus = document.getElementById("ostatus").value;
	var orderintent = document.getElementById("ointent").value;
	var orderpriority = document.getElementById("opriority").value;
		
	//category code, display or freetext handling
	var ordercategory = null
	var ordercategorydisplay = "";
	var ordercategorySNOMEDcode = "";	
	if (document.getElementById("ocategory").value){		
		var ocategoryValue = document.getElementById("ocategory").value;
		var categoryPos = ocategoryValue.search("-SNOMEDCode=");
		ordercategorydisplay = ocategoryValue.substring(0,categoryPos);
		ordercategorySNOMEDcode = ocategoryValue.substring(categoryPos + 12);
		
		ordercategory = {
			"coding": [
			  {
				"system": "http://snomed.info/sct",
				 "code": ordercategorySNOMEDcode,
				 "display": ordercategorydisplay,
				 "userSelected": false
			  }
			],
			"text": ordercategorydisplay
		  };
	}
	
	//order code, display or freetext handling
	var ordercode = null
	var ordercodedisplay = "";
	var orderLOINCcode = "";	
	var orderfreetext = "";
	if (document.getElementById("ocode").value){		
		var ordercodevalue = document.getElementById("ocode").value;
		var orderPos = ordercodevalue.search("-LOINCCode=");
		ordercodedisplay = ordercodevalue.substring(0,orderPos);
		orderLOINCcode = ordercodevalue.substring(orderPos + 11);
		
		ordercode = {
			"coding": [
			  {
				"system": "http://loinc.org",
				 "code": orderLOINCcode,
				 "display": ordercodedisplay,
				 "userSelected": false
			  }
			]
		  };
	}
	//free text order	
	else if (document.getElementById("ofreetext").value){		
		orderfreetext = document.getElementById("ofreetext").value;
		ordercode = {
			"text": orderfreetext
		  };
	}
		
	//authored On date time
	var orderauthoredOnDateTime = new Date(); 
	orderauthoredOnDateTime = formatdttm(orderauthoredOnDateTime);
		
	var orderrequester = null;
	var orderrequestervalue = "";
	if (document.getElementById("orequester").value){
		orderrequestervalue = document.getElementById("orequester").value;
		orderrequester = {
			"agent": { 
				"reference": "Practitioner/" + orderrequestervalue
				}
		};
	}
		
	//order reason
	var orderreason = null;
	var orderreasontext = "";
	if (document.getElementById("oreason").value){
		orderreasontext = document.getElementById("oreason").value;	
		orderreason = {		
			"text": orderreasontext
		};
	}
		
	//order note
	var ordernote = null;
	var ordernotedata = "";
	if (document.getElementById("onote").value){
		ordernotedata = document.getElementById("onote").value;
		ordernote = {
			"text": ordernotedata
		};
	}
	
	//start creacting JSON
	
	if (ordercode){ 	
		
		procrequestdata = 	
		{
		  "resourceType": "ProcedureRequest",
		  "identifier": orderidentifier,		 
		  "requisition": orderrequisition,
		  "status": orderstatus,
		  "intent": orderintent,
		  "priority": orderpriority,
		  "category": ordercategory,
		  "code": ordercode,		  
		  "subject": {
			"reference": "Patient/" + patientId 
		  },
		  "context": {
			"reference": "Encounter/" + encounterId
		  },		 
		  "authoredOn": orderauthoredOnDateTime,		  
		  "requester": orderrequester,
		  "reasonCode": orderreason,		 
		  "note": ordernote
		};		
		
	}
		
	if (procrequestdata){
				
		procrequestdata = JSON.stringify(procrequestdata); // this converts javascript object to json string
		//procrequestdata = JSON.parse(procrequestdata); //this converts json string to javascript object
		//console.log(procrequestdata);
		//alert (procrequestdata);
		var ordertabledata = "";
		ordertabledata = "<tr><td>" + orderidentifiervalue + "</td><td>" + orequisitiontext + "</td><td>" + ordercodedisplay + orderfreetext + "</td><td>" + orderauthoredOnDateTime + "</td><td>" + patientId + "</td><td>" + encounterId + "</td><td>" + orderstatus + "</td><td>" + orderintent + "</td><td>" + orderpriority + "</td><td>" + ordercategorydisplay + "</td><td>" + orderrequestervalue + "</td><td>" + orderreasontext + "</td><td>" + ordernotedata + "</td></tr>";
		var orderData = "<tr><th>Order ID</th><th>Requisition</th><th>Order</th><th>Order Date/Time</th><th>Patient ID</th><th>Encounter ID</th><th>Status</th><th>Intent</th><th>Priority</th><th>Category</th><th>Requester</th><th>Reason</th><th>Note</th></tr>" + ordertabledata;
		document.getElementById("ordertable").innerHTML = orderData;
		document.getElementById("procrequestjson").innerHTML = procrequestdata;
	}
	
	return;
}	

