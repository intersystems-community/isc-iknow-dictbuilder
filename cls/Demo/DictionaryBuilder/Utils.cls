Class Demo.DictionaryBuilder.Utils
{

ClassMethod CreateRestWebApp(ByRef pWebAppName = "") As %Status
{
	set tSC = $$$OK, tCreated=0, tCurrentNS = $$$LOWER($namespace)
	try {
		set:pWebAppName="" pWebAppName = "/csp/"_tCurrentNS_"/dbREST/"
		set tProperties("NameSpace") = tCurrentNS
		set tProperties("DispatchClass") = "Demo.DictionaryBuilder.RestHandler"
		set tProperties("AutheEnabled") = $$$AutheUnauthenticated
		//set tProperties("iKnowEnabled") = 1
		
		zn "%SYS"
		if '##class(Security.Applications).Exists(pWebAppName) {
			set tSC = ##class(Security.Applications).Create(pWebAppName, .tProperties)
			quit:$$$ISERR(tSC)
			set tCreated=1
		}
		
	} catch (ex) {
		set tSC = ex.AsStatus()
	}
	zn tCurrentNS
	
	if $$$ISERR(tSC) {
		write !,"WARNING: unable to create web application due to the following error:",!
		do $system.OBJ.DisplayError(tSC)
		write !,"You'll still have to create a web application '",pWebAppName,"' referring to Demo.DictionaryBuilder.RestHandler",!
	} elseif (tCreated) {
		write !,"Web Application '"_pWebAppName_"' created successfully",!
	}
	
	quit $$$OK
}

}

