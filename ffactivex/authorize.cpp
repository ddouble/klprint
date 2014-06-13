/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * The Original Code is RSJ Software GmbH code.
 *
 * The Initial Developer of the Original Code is
 * RSJ Software GmbH.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributors:
 *                 Ruediger Jungbeck <ruediger.jungbeck@rsj.de>
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
// This function is totally disabled now.
#if 0
#include <stdio.h>

#include <windows.h>
#include <winreg.h>

#include "npactivex.h"
#include "atlutil.h"

#include "authorize.h"

// ----------------------------------------------------------------------------
#define SUB_KEY L"SOFTWARE\\MozillaPlugins\\@itstructures.com/npactivex\\MimeTypes\\application/x-itst-activex"

// ----------------------------------------------------------------------------

BOOL TestExplicitAuthorizationUTF8 (const char *MimeType,
									const char *AuthorizationType,
									const char *DocumentUrl,
									const char *ProgramId);

BOOL TestExplicitAuthorization (const wchar_t *MimeType,
								const wchar_t *AuthorizationType,
								const wchar_t *DocumentUrl,
								const wchar_t *ProgramId);

BOOL WildcardMatch (const wchar_t *Mask,
                    const wchar_t *Value);

HKEY FindKey (const wchar_t *MimeType,
              const wchar_t *AuthorizationType);

// ---------------------------------------------------------------------------

HKEY BaseKeys[] = {
	HKEY_CURRENT_USER,
	HKEY_LOCAL_MACHINE
};

// ----------------------------------------------------------------------------

BOOL TestAuthorization (NPP Instance,
						int16 ArgC,
						char *ArgN[],
						char *ArgV[],
						const char *MimeType)
{
	BOOL ret = FALSE;
	NPObject *globalObj = NULL;
	NPIdentifier identifier;
	NPVariant varLocation;
	NPVariant varHref;
	bool rc = false;
	int16 i;
	char *wrkHref;

#ifdef NDEF
	_asm{int 3};
#endif
	if (Instance == NULL) {

		return (FALSE);
	}

	// Determine owning document
	// Get the window object.
	NPNFuncs.getvalue(Instance, 
	NPNVWindowNPObject, 
	&globalObj);

	// Create a "location" identifier.
	identifier = NPNFuncs.getstringidentifier("location");

	// Get the location property from the window object (which is another object).
	rc = NPNFuncs.getproperty(Instance, 
							  globalObj, 
							  identifier, 
							  &varLocation);

	NPNFuncs.releaseobject(globalObj);

	if (!rc){

		np_log(Instance, 0, "AxHost.TestAuthorization: could not get the location from the global object");
		return false;
	}

	// Get a pointer to the "location" object.
	NPObject *locationObj = varLocation.value.objectValue;

	// Create a "href" identifier.
	identifier = NPNFuncs.getstringidentifier("href");

	// Get the location property from the location object.
	rc = NPNFuncs.getproperty(Instance, 
							  locationObj, 
							  identifier, 
							  &varHref);

	NPNFuncs.releasevariantvalue(&varLocation);

	if (!rc) {

		np_log(Instance, 0, "AxHost.TestAuthorization: could not get the href from the location property");
		return false;
	}

	ret = TRUE;

	wrkHref = (char *) alloca(varHref.value.stringValue.UTF8Length + 1);

	memcpy(wrkHref,
		   varHref.value.stringValue.UTF8Characters,
		   varHref.value.stringValue.UTF8Length);

	wrkHref[varHref.value.stringValue.UTF8Length] = 0x00;
	NPNFuncs.releasevariantvalue(&varHref);

	for (i = 0; 
		 i < ArgC; 
		 ++i) {

		// search for any needed information: clsid, event handling directives, etc.
		if (0 == strnicmp(ArgN[i], PARAM_CLSID, strlen(PARAM_CLSID))) {

			ret &= TestExplicitAuthorizationUTF8(MimeType,
												 PARAM_CLSID,
												 wrkHref,
												 ArgV[i]);
		} else if (0 == strnicmp(ArgN[i], PARAM_PROGID, strlen(PARAM_PROGID))) {
			// The class id of the control we are asked to load
			ret &= TestExplicitAuthorizationUTF8(MimeType,
												 PARAM_PROGID,
												 wrkHref,
												 ArgV[i]);
		} else if( 0  == strnicmp(ArgN[i], PARAM_CODEBASEURL, strlen(PARAM_CODEBASEURL))) {
			ret &= TestExplicitAuthorizationUTF8(MimeType,
												 PARAM_CODEBASEURL,
												 wrkHref,
												 ArgV[i]);		
		}
	}

	np_log(Instance, 1, "AxHost.TestAuthorization: returning %s", ret ? "True" : "False");
	return (ret);
}

// ----------------------------------------------------------------------------

BOOL TestExplicitAuthorizationUTF8 (const char *MimeType,
									const char *AuthorizationType,
									const char *DocumentUrl,
									const char *ProgramId)
{
	USES_CONVERSION;
	BOOL ret;

	ret = TestExplicitAuthorization(A2W(MimeType),
									A2W(AuthorizationType),
									A2W(DocumentUrl),
									A2W(ProgramId));

	return (ret);
}

// ----------------------------------------------------------------------------

BOOL TestExplicitAuthorization (const wchar_t *MimeType,
                                const wchar_t *AuthorizationType,
								const wchar_t *DocumentUrl,
                                const wchar_t *ProgramId)
{
	BOOL ret = FALSE;

#ifndef NO_REGISTRY_AUTHORIZE

	HKEY hKey;
	HKEY hSubKey;
	ULONG i;
	ULONG j;
	ULONG keyNameLen;
	ULONG valueNameLen;
	wchar_t keyName[_MAX_PATH];
	wchar_t valueName[_MAX_PATH];

	if (DocumentUrl == NULL) {

		return (FALSE);
	}

	if (ProgramId == NULL) {

		return (FALSE);
	}

#ifdef NDEF
	MessageBox(NULL,
	DocumentUrl,
	ProgramId,
	MB_OK);
#endif

	if ((hKey = FindKey(MimeType,
						AuthorizationType)) != NULL) {                   

		for (i = 0;
			 !ret;
			 i++) {

			keyNameLen = sizeof(keyName);

			if (RegEnumKey(hKey,
						   i,
						   keyName,
						   keyNameLen) == ERROR_SUCCESS) {

				if (WildcardMatch(keyName,
								  DocumentUrl)) {

					if (RegOpenKeyEx(hKey,
									 keyName,
									 0,
									 KEY_QUERY_VALUE,
									 &hSubKey) == ERROR_SUCCESS) {

						for (j = 0;
							 ;
							 j++) {

							valueNameLen = sizeof(valueName);

							if (RegEnumValue(hSubKey,  
											 j,
											 valueName,
											 &valueNameLen,
											 NULL,
											 NULL,
											 NULL,
											 NULL) != ERROR_SUCCESS) {

								break;                               
							}     
							if (WildcardMatch(valueName,
											  ProgramId)) {

								ret = TRUE;
								break;
							}                        
						}
						RegCloseKey(hSubKey);
					}
					if (ret) {

						break;
					}
				}
			} else {

				break;
			}
		}      
		RegCloseKey(hKey);
	}                   
#endif

	return (ret);
}
// ----------------------------------------------------------------------------

BOOL WildcardMatch (const wchar_t *Mask,
                    const wchar_t *Value)
{
	size_t i;
	size_t j = 0;
	size_t maskLen;
	size_t valueLen;

	maskLen = wcslen(Mask);
	valueLen = wcslen(Value);

	for (i = 0;
		 i < maskLen + 1;
		 i++) {

		if (Mask[i] == '?') {

			j++;
			continue;
		}

		if (Mask[i] == '*') {
			for (;
				 j < valueLen + 1;
				 j++) {

				if (WildcardMatch(Mask + i + 1,
								  Value + j)) {

					return (TRUE);
				}
			}
			return (FALSE);
		}

		if ((j <= valueLen) &&
			(Mask[i] == tolower(Value[j]))) {

			j++;
			continue;
		}

		return (FALSE);
	}
	return (TRUE);
}  

// ----------------------------------------------------------------------------

HKEY FindKey (const wchar_t *MimeType,
              const wchar_t *AuthorizationType)
{
	HKEY ret = NULL;
	HKEY plugins;
	wchar_t searchKey[_MAX_PATH];
	wchar_t pluginName[_MAX_PATH];
	DWORD j;
	size_t i;

	for (i = 0;
		 i < ARRAYSIZE(BaseKeys);
		 i++) {

		if (RegOpenKeyEx(BaseKeys[i],
						 L"SOFTWARE\\MozillaPlugins",
						 0,
						 KEY_ENUMERATE_SUB_KEYS,
						 &plugins) == ERROR_SUCCESS) {

			for (j = 0;
				 ret == NULL;
				 j++) {

				if (RegEnumKey(plugins,
							   j,
							   pluginName,
							   sizeof(pluginName)) != ERROR_SUCCESS) {

					break;
				}

				wsprintf(searchKey,
						 L"%s\\MimeTypes\\%s\\%s",
						 pluginName,
						 MimeType,
						 AuthorizationType);

				if (RegOpenKeyEx(plugins,
								 searchKey,
								 0,
								 KEY_ENUMERATE_SUB_KEYS,
								 &ret) == ERROR_SUCCESS) {

					break;
				}

				ret = NULL;
			}

			RegCloseKey(plugins);

			if (ret != NULL) {

				break;
			}
		}
	}

	return (ret);
}

#endif