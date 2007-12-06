// define a global res object for all the code bits that use res during initialization, 
// when no client request evaluator is initialized yet
res = new Packages.helma.framework.ResponseBean(new Packages.helma.framework.ResponseTrans(app.__app__, null));
