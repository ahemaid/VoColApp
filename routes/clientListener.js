var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var fs = require('fs');
var  jsonfile  =  require('jsonfile');
var shell = require('shelljs');
var rdfTranslator = require('rdf-translator');

//var spawn = require('child_process').spawn;
//spawn('../scripts/mainBranchScript.sh', [commitMessage, branchNameParam]);

var path = "../jsonDataFiles/userConfigurations.json";
fs.exists(path, function(exists) {
      if (exists) {
        jsonfile.readFile(path, function(err, obj)  {
            if (err)
              console.log(err); 
            //show what inside the file             //
            // var repository = obj.repository.trim();
            // repository = repository.split(".git");
            // console.log(repository);

            var repositoryService = obj.repositoryService;
            var repositoryNameParam = obj.repositoryName;
            var branchNameParam = obj.branchName;
            //TODO: which value goes here
            var otherBranchesParam = '#otherBranchesParam';

            var port = 3001;

            // app.set('port', port);
            // //TODO: enable listening to the port
            // var server = http.createServer(app).listen(port, function() {
            //   console.log('WebHookListener running at http://localhost:' + port);
            // });
            // server.on('request', function(req, res) {
            //     req.setEncoding('utf8');
            //     req.on('data', function(chunk) {
            //         console.log('event received');
            //         try {
            //           var data = JSON.parse(chunk);
            //
            //           console.log(chunk);
            //
            //           var repositoryName = "";
            //           var branchName = "";
            //           var commitMessage = "";
            //
            //           if (repositoryService === 'gitHub') {
            //             repositoryName = data.repository.html_url;
            //             branchName = data.ref.split('/')[2];
            //             commitMessage = data.head_commit.message;
            //           } else if (repositoryService === 'gitLab') {
            //             repositoryName = data.repository.homepage;
            //             branchName = data.ref;
            //             commitMessage = data.commits[0].message;
            //           } else if (repositoryService === 'bitBucket') {
            //             repositoryName = data.repository.links.html.href;
            //             branchName = data.push.changes[0].old.name;
            //             commitMessage = data.push.changes[0].new.target.message;
            //           } else {
            //             repositoryName = repositoryNameParam;
            //             branchName = data.refChanges[0].refId.split('/')[2];
            //             commitMessage = data.changesets.values[0].toCommit.message;
            //           }
            //
            //           if (branchName.includes(branchNameParam) && repositoryNameParam === repositoryName && !commitMessage.includes("merge")) {
            //             console.log('contains');
            //
            //             commitMessage = commitMessage.replace(/\n/g, '');

                        shell.cd('../../repoFolder', {
                          silent: false
                        }).stdout;
                        // shell.exec('git checkout ${2}', {
                        //   silent: false
                        // }).stdout;
                        // shell.exec('git reset --hard', {
                        //   silent: false
                        // }).stdout;
                        // shell.exec('git pull', {
                        //   silent: false
                        // }).stdout;


                        shell.rm('-f','../VoColApp/jsonDataFiles/syntaxErrors.json').stdout;
                        var pass = true;
                        var data = shell.exec('find . -type f -not -path "*evolution*" -not -path "*serializations*" -not -path "*apache-jena-fuseki*" -name \'*.ttl\'', {
                          silent: false
                        });
                        // result of searched file of .ttl
                        var files = data.split(/[\n]/);
                        var errors = "";

                        for (var i = 0; i < files.length - 1; i++) {
                          // validation of the turtle files
                          var output = shell.exec('ttl ' + files[i] + '', {
                            silent: true
                          })
                          // converting file from turtle to ntriples format
                          shell.exec('rapper -i turtle -o ntriples ' + files[i] + ' >> SingleVoc.nt', {
                            silent: false
                          }).stdout;
                          // check if there are syntax errors of turtle format
                          if (!output.stdout.includes("0 errors.")) {
                            errors += "<h3>Error in file "+ files[i] + "</h3><h4>" + output.split('\n')[0] + "</h4><br/>";
                            pass = false;
                          }
                          console.log(files[i]);
                        }
                        // display syntax errors
                        console.log("Errors:\n" + errors);
                        if(errors){
                          var filePath = '../VoColApp/jsonDataFiles/syntaxErrors.json';
                          fs.writeFileSync(filePath, errors);
                          console.log("Errors file is generated\n" );
                        }

                        //if no syntax errors, then contiune otherwise stop
                        if (pass) {
                          // converting back to turtle format
                          shell.exec('rapper -i ntriples  -o turtle SingleVoc.nt > SingleVoc.ttl', {
                            silent: false
                          }).stdout;
                          shell.mkdir('serializations');
                          shell.mv('-f', 'SingleVoc.ttl', 'serializations/');
                          shell.mv('-f', 'SingleVoc.nt', 'serializations/');

                          shell.rm('-rf', 'apache-jena-fuseki')
                          shell.cp('-r', '../VoColApp/helper/tools/apache-jena-fuseki', 'apache-jena-fuseki/');
                          shell.cd('-p', 'apache-jena-fuseki');
                          shell.exec('fuser -k 3030/tcp', {
                            silent: false
                          }).stdout;
                          shell.exec('rm run/system/tdb.lock', {
                            silent: false
                          }).stdout;
                          // show the cuurent path
                          shell.exec('pwd');
                          // generation the Json files
                          shell.cd("../../VoColApp/helper/tools/JenaJsonFilesGenrator/").stdout;
                          shell.exec('java -jar JenaJsonFilesGenerator.jar').stdout;

                          // display visualization part if the user selected it from the configuration page
                          if (obj.visualization === "true") {
                            shell.cd('../owl2vowl/').stdout;
                            shell.exec('java -jar owl2vowl.jar -file ../../../../repoFolder/serializations/SingleVoc.ttl', {
                              silent: false
                            }).stdout;
                            shell.mv('SingleVoc.json', '../../../views/webvowl/js/data').stdout;
                          }

                          // Evolution Part
                          if (fs.existsSync('../../../../repoFolder/serializations/SingleVoc.ttl')) {
                            shell.cd('../owl2vcs/').stdout;
                            var evolutionReport = shell.exec('./owl2diff ../../../../repoFolder/evolution/SingleVoc.ttl ../../../../repoFolder/serializations/SingleVoc.ttl', {
                              silent: false
                            }).stdout;
                            if (evolutionReport.includes('identical')) {

                              var constantString = shell.exec('diff SingleVoc.ttl  ../../../../repoFolder/serializations/SingleVoc.ttl', {
                                silent: false
                              }).stdout;
                              console.log(constantString);
                            }
                            // Do something
                          }
                          console.log(evolutionReport);
                          shell.exec('pwd');
                          shell.mkdir('../../../../repoFolder/evolution').stdout;
                          shell.cp('../../../../repoFolder/serializations/SingleVoc.ttl', '../../../../repoFolder/evolution/SingleVoc.ttl').stdout;

                          //
                          //evolutionReport = $(. / owl2diff / home / vagrant / VoCol / evolution / SingleVoc.ttl / home / vagrant / repoFolder / SingleVoc.ttl - c 2 > & 1)
                          //
                          //if echo $evolutionReport | grep - q - v "identical";
                          // then
                          //
                          // # Evolution fileContent = `cat /home/vagrant/schemaorg/docs/evolution.html`
                          // #Evolution constant_string = "diff SingleVoc.ttl /home/vagrant/repoFolder/SingleVoc.ttl"#
                          // Evolution generationDate = $(date "+%d-%m-%Y %H-%M-%S")# Evolution openTag = "<"#
                          // Evolution closeTag = ">"#
                          // Evolution openTagHtml = "&lt;"#
                          // Evolution closeTagHtml = "&gt;"#
                          // Evolution reportDiv = "<div> </div>"#
                          // Evolution add = "+ "#
                          // Evolution del = "- "#
                          // Evolution reportBreakInAddition = "</br>+"#
                          // Evolution reportBreakInDeletion = "</br>-"#
                          // Evolution evolutionReport = "${evolutionReport//$openTag/$openTagHtml}"#
                          // Evolution evolutionReport = "${evolutionReport//$closeTag/$closeTagHtml}"#
                          // Evolution evolutionReport = "${evolutionReport/$constant_string/}"#
                          // Evolution evolutionReport = "${evolutionReport//$del/$reportBreakInDeletion}"#
                          // Evolution evolutionReport = "${evolutionReport//$add/$reportBreakInAddition}"
                          //
                          // #Evolution uniqueID = $(cat / proc / sys / kernel / random / uuid)
                          // # Evolution result_Content = "${fileContent/$reportDiv/$reportDiv</hr></br><div id=\"$uniqueID\">${1}:$generationDate$evolutionReport</div></br>}"
                          // #Evolution echo "${result_Content}" > /home/vagrant / schemaorg / docs / evolution.html# Evolution rm / home / vagrant / VoCol / evolution / SingleVoc.ttl
                          // # Evolution cd / home / vagrant / VoCol
                          // # Evolution node helper.js $uniqueID "\"${1}\""
                          // # Evolution fi# Evolution fi
                          //
                          // # Evolution cp / home / vagrant / repoFolder / SingleVoc.ttl / home / vagrant / VoCol / evolution / SingleVoc.ttl


                          shell.exec('pwd');

                          //shell.exec('npm start &').stdout;

                          shell.cd("../../../../repoFolder/apache-jena-fuseki").stdout;
                          shell.exec('./fuseki-server --file=../serializations/SingleVoc.ttl /dataset &', {
                            silent: false
                          }).stdout;
                        }
                //       }
                //
                //       } catch (e) {
                //         console.log("error:");
                //         console.log(e);
                //       }
                //     });
                // });
            });
        }
      });
