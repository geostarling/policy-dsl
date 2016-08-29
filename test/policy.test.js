var test = require('tape');
var propertyEquals = require('../src/policy').predicates.propertyEquals;
var tPred = require('../src/policy').predicates.t;
var fPred = require('../src/policy').predicates.f;
var not = require('../src/policy').not;
var when = require('../src/policy').when;
var permit = require('../src/policy').permit;
var isNotApplicable = require('../src/policy').isNotApplicable;
var isIndeterminate = require('../src/policy').isIndeterminate;
var isDeny = require('../src/policy').isDeny;
var isPermit = require('../src/policy').isPermit;
var permitOverrides = require('../src/policy').permitOverrides;
var denyOverrides = require('../src/policy').denyOverrides;
var deny = require('../src/policy').deny;
var predicate = require('../src/policy').predicate;
var resolution = require('../src/policy').resolution;
var resolutions = require('../src/policy').resolutions;
var mapObjIndexed = require('../src/utils').mapObjIndexed;


test('when is predicate builder', function testFn(t) {
  t.equals(typeof when().then, 'function');
  t.end();
});

test('then is otherwise builder', function testFn(t) {
  t.equals(typeof when().then().otherwise, 'function');
  t.end();
});

test('empty when predicate', function testFn(t) {
  t.false(when()({}));
  t.end();
});

test('propertyEquals', function testFn(t) {
  var context = { propA: 'valA' };
  t.true(propertyEquals('propA', 'valA')(context));
  t.end();
});

test('then should resolve on truthy predicate', function testFn(t) {
  var policy = when(tPred())
        .then(permit())
        .otherwise(deny());
  t.true(
    isPermit(policy()));
  t.end();
});

test('otherwise should resolve on falsy predicate', function testFn(t) {
  var policy = when()
        .then(permit())
        .otherwise(deny());
  t.true(
    isDeny(policy()));
  t.end();
});

test('and predicate works as expected', function testFn(t) {
  t.false(fPred().and(fPred())());
  t.false(fPred().and(tPred())());
  t.false(tPred().and(fPred())());
  t.true(tPred().and(tPred())());
  t.end();
});

test('or predicate works as expected', function testFn(t) {
  t.false(fPred().or(fPred())());
  t.true(fPred().or(tPred())());
  t.true(tPred().or(fPred())());
  t.true(tPred().or(tPred())());
  t.end();
});

test('not predicate works as expected', function testFn(t) {
  t.true(not(fPred())());
  t.true(not(not(tPred()))());
  t.end();
});

test('logical operators combined should work as expected', function testFn(t) {
  t.true(not(fPred()).and(tPred().or(fPred()))());
  t.end();
});

test('missing otherwise should resolve as \'Not Applicable\' on falsy predicate', function testFn(t) {
  t.true(isNotApplicable(when(fPred()).then(permit())()));
  t.end();
});

test('matching policy without resolution should resolve as \'Indeterminate\'', function testFn(t) {
  var thenPolicy = when(tPred()).then();
  var thenOtherwisePolicy = when(tPred()).then().otherwise();

  t.true(isIndeterminate(thenPolicy()));
  t.true(isIndeterminate(thenOtherwisePolicy()));
  t.end();
});

test('permitOverrides combining policy works as expected', function testFn(t) {
  var permitPolicy = when(tPred()).then(permit());
  var denyPolicy = when(tPred()).then(deny());
  var notApplicablePolicy = when(fPred()).then();
  var indeterminatePolicy = when(tPred()).then();

  t.true(isPermit(permitOverrides(permitPolicy, denyPolicy)()));
  t.true(isPermit(permitOverrides(permitPolicy, permitPolicy)()));
  t.true(isDeny(permitOverrides(denyPolicy, denyPolicy)()));
  t.true(isNotApplicable(permitOverrides(notApplicablePolicy, notApplicablePolicy)()));
  t.true(isIndeterminate(permitOverrides(indeterminatePolicy, notApplicablePolicy)()));

  // TODO generate all combinations ...
  t.end();
});


test('denyOverrides combining policy works as expected', function testFn(t) {
  var permitPolicy = when(tPred()).then(permit());
  var denyPolicy = when(tPred()).then(deny());
  var notApplicablePolicy = when(fPred()).then();
  var indeterminatePolicy = when(tPred()).then();

  t.true(isDeny(denyOverrides(permitPolicy, denyPolicy)()));
  t.true(isPermit(denyOverrides(permitPolicy, permitPolicy)()));
  t.true(isDeny(denyOverrides(denyPolicy, denyPolicy)()));
  t.true(isDeny(denyOverrides(denyPolicy, notApplicablePolicy)()));
  t.true(isNotApplicable(denyOverrides(notApplicablePolicy, notApplicablePolicy)()));
  t.true(isIndeterminate(denyOverrides(indeterminatePolicy, notApplicablePolicy)()));

  // TODO generate all combinations ...
  t.end();
});

test('it is possible to nest combining policies', function testFn(t) {
  var permitPolicy = when(tPred()).then(permit());
  var denyPolicy = when(tPred()).then(deny());

  t.true(
    isPermit(
      permitOverrides(
        denyOverrides(permitPolicy, denyPolicy),
        permitOverrides(permitPolicy, denyPolicy)
      )()));


  t.true(
    isDeny(
      denyOverrides(
        denyOverrides(permitPolicy, denyPolicy),
        permitOverrides(permitPolicy, denyPolicy)
      )()));

  t.end();
});

test('mapObjIndexed', function testFn(t) {
  var mapFn = function mapFn(val, key, obj) {
    return key + 2 * val;
  };
  t.deepEqual(
    mapObjIndexed(mapFn, { a: 1, b: 2, c: 3}),
    { a: 'a2', b: 'b4', c: 'c6' });
  t.end();
});

test('user-defined predicates can be fluently combined', function testFn(t) {
  var pred = predicate(function dummyPred() {
    return function predFn(ctx) {
      return 1 === ctx;
    };
  });
  var policy =
        when(pred().and(pred().or(pred())))
        .then(permit())
        .otherwise(deny());
  t.true(isPermit(policy(1)));

  t.end();
});

test('user-defined resolutions can be fluently combined', function testFn(t) {
  var r = resolutions({
    resolutionA: resolution(function resA() {
      return function resFn(ctx, resultSoFar) {
        resultSoFar.a =  1;
        return resultSoFar;
      };
    }),
    resolutionB: resolution(function resA() {
      return function resFn(ctx, resultSoFar) {
        resultSoFar.b =  2;
        return resultSoFar;
      };
    })
  });

  var resolutionA = r.resolutionA;

  var permitPolicy =
        when(tPred())
        .then(resolutionA().
              resolutionB().
              permit())
        .otherwise(deny());
  var result = permitPolicy();
  t.true(isPermit(result));
  t.equals(result.a, 1);
  t.equals(result.b, 2);

  var denyPolicy =
        when(fPred())
        .then(permit())
        .otherwise(
          resolutionA().
          resolutionB().
          deny());
  var denyResult = denyPolicy();
  t.true(isDeny(denyResult));
  t.equals(denyResult.a, 1);
  t.equals(denyResult.b, 2);

  t.end();
});

test('order of resolutions execution is maintained', function testFn(t) {
  var policy =
        when(tPred())
        .then(permit().deny())
        .otherwise(deny());
  t.true(isDeny(policy()));
  t.end();
});
