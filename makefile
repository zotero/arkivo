BIN = ./node_modules/.bin

SRC = lib/*.js lib/**/*.js
TEST = test/*.js test/*.js test/http/*.js test/plugins/*.js

export ALLOW_CONFIG_MUTATIONS = 1

doc:
	${BIN}/yuidoc .

lint:
	@${BIN}/eslint ${SRC} ${TEST} ./bin/*.js

test: lint
	@${BIN}/mocha ${TEST}

debug:
	@${BIN}/mocha debug ${TEST}

test-travis:
	@node ${BIN}/istanbul cover ${BIN}/_mocha --report-lcovonly -- ${TEST}

spec:
	@${BIN}/mocha --reporter spec ${TEST}

coverage: clean
	@node ${BIN}/istanbul cover ${BIN}/_mocha -- ${TEST}

clean:
	@rm -rf ./coverage
	@rm -rf ./doc

.PHONY: lint doc clean test debug test-travis spec watch coverage
