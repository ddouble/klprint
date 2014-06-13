/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is itstructures.com code.
 *
 * The Initial Developer of the Original Code is IT Structures.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor:
 *                Ruediger Jungbeck <ruediger.jungbeck@rsj.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// dllmain.cpp : Defines the entry point for the DLL application.
#include "npactivex.h"
#include "axhost.h"
#include "atlthunk.h"
#include "FakeDispatcher.h"
CComModule _Module;

NPNetscapeFuncs NPNFuncs;

BOOL APIENTRY DllMain( HMODULE hModule,
                       DWORD  ul_reason_for_call,
                       LPVOID lpReserved
					 )
{
	switch (ul_reason_for_call)
	{
	case DLL_PROCESS_ATTACH:
	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
	case DLL_PROCESS_DETACH:
		break;
	}
	return TRUE;
}

// ==============================
// ! Scriptability related code !
// ==============================
//
// here the plugin is asked by Mozilla to tell if it is scriptable
// we should return a valid interface id and a pointer to 
// nsScriptablePeer interface which we should have implemented
// and which should be defined in the corressponding *.xpt file
// in the bin/components folder
NPError	NPP_GetValue(NPP instance, NPPVariable variable, void *value)
{
	if(instance == NULL)
		return NPERR_INVALID_INSTANCE_ERROR;

	NPError rv = NPERR_NO_ERROR;

	if(instance == NULL)
		return NPERR_GENERIC_ERROR;

	CAxHost *host = (CAxHost *)instance->pdata;
	if(host == NULL)
		return NPERR_GENERIC_ERROR;

	switch (variable) {
	case NPPVpluginNameString:
		*((char **)value) = "ITSTActiveX";
		break;

	case NPPVpluginDescriptionString:
		*((char **)value) = "IT Structures ActiveX for Firefox";
		break;

	case NPPVpluginScriptableNPObject:
		*(NPObject **)value = host->GetScriptableObject();
		break;

	default:
		rv = NPERR_GENERIC_ERROR;
	}

	return rv;
}

NPError NPP_NewStream(NPP instance,
                      NPMIMEType type,
                      NPStream* stream, 
                      NPBool seekable,
                      uint16* stype)
{
	if(instance == NULL)
		return NPERR_INVALID_INSTANCE_ERROR;

	NPError rv = NPERR_NO_ERROR;
	return rv;
}

int32_t NPP_WriteReady (NPP instance, NPStream *stream)
{
	if(instance == NULL)
		return NPERR_INVALID_INSTANCE_ERROR;

	int32 rv = 0x0fffffff;
	return rv;
}

int32_t NPP_Write (NPP instance, NPStream *stream, int32_t offset, int32_t len, void *buffer)
{   
	if(instance == NULL)
		return NPERR_INVALID_INSTANCE_ERROR;

	int32 rv = len;
	return rv;
}

NPError NPP_DestroyStream (NPP instance, NPStream *stream, NPError reason)
{
	if(instance == NULL)
		return NPERR_INVALID_INSTANCE_ERROR;

	NPError rv = NPERR_NO_ERROR;
	return rv;
}

void NPP_StreamAsFile (NPP instance, NPStream* stream, const char* fname)
{
	if(instance == NULL)
		return;
}

void NPP_Print (NPP instance, NPPrint* printInfo)
{
	if(instance == NULL)
		return;
}

void NPP_URLNotify(NPP instance, const char* url, NPReason reason, void* notifyData)
{
	if(instance == NULL)
		return;
}

NPError NPP_SetValue(NPP instance, NPNVariable variable, void *value)
{
	if(instance == NULL)
		return NPERR_INVALID_INSTANCE_ERROR;

	NPError rv = NPERR_NO_ERROR;
	return rv;
}

int16 NPP_HandleEvent(NPP instance, void* event)
{
	if(instance == NULL)
		return 0;

	int16 rv = 0;
	CAxHost *host = dynamic_cast<CAxHost*>((CHost *)instance->pdata);
	if (host)
		rv = host->HandleEvent(event);

	return rv;
}

NPError OSCALL NP_GetEntryPoints(NPPluginFuncs* pFuncs)
{

	if(pFuncs == NULL)
		return NPERR_INVALID_FUNCTABLE_ERROR;

	if(pFuncs->size < sizeof(NPPluginFuncs))
		return NPERR_INVALID_FUNCTABLE_ERROR;

	pFuncs->version       = (NP_VERSION_MAJOR << 8) | NP_VERSION_MINOR;
	pFuncs->newp          = NPP_New;
	pFuncs->destroy       = NPP_Destroy;
	pFuncs->setwindow     = NPP_SetWindow;
	pFuncs->newstream     = NPP_NewStream;
	pFuncs->destroystream = NPP_DestroyStream;
	pFuncs->asfile        = NPP_StreamAsFile;
	pFuncs->writeready    = NPP_WriteReady;
	pFuncs->write         = NPP_Write;
	pFuncs->print         = NPP_Print;
	pFuncs->event         = NPP_HandleEvent;
	pFuncs->urlnotify     = NPP_URLNotify;
	pFuncs->getvalue      = NPP_GetValue;
	pFuncs->setvalue      = NPP_SetValue;
	pFuncs->javaClass     = NULL;

	return NPERR_NO_ERROR;
}

#define MIN(x, y)	((x) < (y)) ? (x) : (y)

/*
 * Initialize the plugin. Called the first time the browser comes across a
 * MIME Type this plugin is registered to handle.
 */
NPError OSCALL NP_Initialize(NPNetscapeFuncs* pFuncs)
{	
	CoInitialize(NULL);
	
	InstallAtlThunkEnumeration();
	if (pHtmlLib == NULL) {
		OLECHAR path[MAX_PATH];
		GetEnvironmentVariableW(OLESTR("SYSTEMROOT"), path, MAX_PATH - 30);
		StrCatW(path, L"\\system32\\mshtml.tlb");
		HRESULT hr = LoadTypeLib(path, &pHtmlLib);
	}

	if(pFuncs == NULL)
		return NPERR_INVALID_FUNCTABLE_ERROR;

#ifdef NDEF
  // The following statements prevented usage of newer Mozilla sources than installed browser at runtime
	if(HIBYTE(pFuncs->version) > NP_VERSION_MAJOR)
		return NPERR_INCOMPATIBLE_VERSION_ERROR;

	if(pFuncs->size < sizeof(NPNetscapeFuncs))
		return NPERR_INVALID_FUNCTABLE_ERROR;
#endif

	if (!AtlAxWinInit()) {

		return NPERR_GENERIC_ERROR;
	}

	_pAtlModule = &_Module;

	memset(&NPNFuncs, 0, sizeof(NPNetscapeFuncs));
	memcpy(&NPNFuncs, pFuncs, MIN(pFuncs->size, sizeof(NPNetscapeFuncs)));

	return NPERR_NO_ERROR;
}

/*
 * Shutdown the plugin. Called when no more instanced of this plugin exist and
 * the browser wants to unload it.
 */
NPError OSCALL NP_Shutdown(void)
{
	AtlAxWinTerm();
	UninstallAtlThunkEnumeration();
	return NPERR_NO_ERROR;
}
