/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   array.js
 *
 * DESCRIPTION
 *   Run procedures using an array as input param
 *
 *
 *****************************************************************************///

var oracledb = require('../');
var dbConfig = require('./dbconfig.js');
var connection;

oracledb.getConnection(
    {
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString
    },
    function (err, conn) {
        if (err) {
            console.error(err.message);
            return;
        }

        connection = conn;

        //createTestPkg() // Run this once to have the TEST_PKG in the DB
        selectNumbers();
        //selectStrings();
    }
);

function createTestPkg() {
    var spec = getTestPkgSpec();
    var body = getTestPkgBody();

    console.log('Creating TEST_PKG spec');
    connection.execute(spec, {}, {autoCommit: false}, function (err, data) {
        if (err) {
            console.error('Error creating TEST_PKG spec, error: %s', err);
            return;
        }

        console.log('TEST_PKG spec created');
        console.log('Creating TEST_PKG body');
        connection.execute(body, {}, {autoCommit: false}, function (err, data) {
            if (err) {
                console.error('Error creating TEST_PKG body, error: %s', err);
                return;
            }
            console.log('TEST_PKG body created');
        });
    });
}

function selectNumbers() {
    var bindvars = {
        numbers:  [ 1, 2, 3, -12.654, 7657.6546, 0.5],
        result:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };

    console.log('Calling sp_get_numbers with args:', bindvars.numbers);
    connection.execute('Begin TEST_PKG.sp_get_numbers(:numbers, :result); End;', bindvars, processResults);
}

function selectStrings() {
    var bindvars = {
        strings:  ['Hey', 'you', 'TheRe'],
        result:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };

    console.log('Calling sp_get_strings with args:', bindvars.strings);
    connection.execute('Begin TEST_PKG.sp_get_strings(:strings, :result); End;', bindvars, processResults);
}

function processResults(err, result) {
    if (err) {
        console.error(err.message);
        return;
    }

    console.log("----- Query Results --------");
    result.outBinds.result.getRows(10, function (err, rows) {
        if (err) {
            console.log('Error getting rows from cursor');
        } else if (rows.length == 0) {
            console.log('No more rows in cursor');
        } else if (rows.length > 0) {
            console.log(rows);
        }

        //result.outBinds.result.close(function(err) {if (err) {console.log(err);}});
        //connection.release(function(err) {if (err) {console.log(err);}});
    });
}

function getTestPkgSpec() {
    return '\
	CREATE OR REPLACE PACKAGE "TEST_PKG" IS \
		TYPE Y_STRINGS_TABLE IS TABLE OF VARCHAR2(4000) INDEX BY PLS_INTEGER; \
		TYPE Y_NUMBERS_TABLE IS TABLE OF NUMBER INDEX BY PLS_INTEGER; \
		PROCEDURE sp_get_numbers(i_arr Y_NUMBERS_TABLE, o_out OUT sys_refcursor); \
		PROCEDURE sp_get_strings(i_arr Y_STRINGS_TABLE, o_out OUT sys_refcursor); \
	END test_pkg;';
}

function getTestPkgBody() {
    return '\
	CREATE OR REPLACE PACKAGE BODY "TEST_PKG" IS \
		PROCEDURE sp_get_numbers(i_arr Y_NUMBERS_TABLE, o_out OUT sys_refcursor) IS \
			vals sys.ODCINumberList := sys.ODCINumberList(); \
		BEGIN \
			IF i_arr.count > 0 THEN \
			    FOR i IN i_arr.first..i_arr.last LOOP \
				    vals.extend(1); \
				    vals(i) := i_arr(i); \
			    END LOOP; \
			END IF; \
			OPEN o_out FOR SELECT * FROM TABLE(vals); \
			END; \
		PROCEDURE sp_get_strings(i_arr Y_STRINGS_TABLE, o_out OUT sys_refcursor) IS \
			vals sys.ODCIVarchar2List := sys.ODCIVarchar2List(); \
		BEGIN \
			IF i_arr.count > 0 THEN \
			    FOR i IN i_arr.first..i_arr.last LOOP \
    				vals.extend(1); \
	    			vals(i) := i_arr(i); \
		    	END LOOP; \
		    END IF; \
			OPEN o_out FOR SELECT * FROM TABLE(vals); \
		END; \
	END test_pkg;';
}