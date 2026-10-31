#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$workspace='<repo>'
$folder=Join-Path $workspace 'docs/evidence/release15/hosting-readiness'
$path=Join-Path $folder 'public-key-diagnosis-20261031.json'
$record=@'
{
  "observationBoundsLocal": {
    "earliest": "2026-10-31T09:39:04-05:00",
    "latest": "2026-10-31T09:40:39-05:00",
    "qualification": "Measured enclosing bounds; endpoint invocation timestamps not individually retained."
  },
  "environments": [
    {
      "logical": "staging",
      "projectRef": "jshjkaigwbxsbnnogfxs",
      "vercelProjectId": "prj_bHGxyZfZU6gsvEOBA5CKljyKq73w",
      "accountId": "team_bWASsr4U8yJQls10eWgbkxKH",
      "publicKeyCount": 2,
      "publicKeyMetadata": [
        {
          "type": "legacy",
          "disabled": false,
          "disabledFieldPresent": true,
          "classification": {
            "kind": "legacy-jwt",
            "role": "anon",
            "ref": "jshjkaigwbxsbnnogfxs",
            "expectedRefMatch": true,
            "expiry": "not-expired-as-decoded",
            "signatureVerified": false
          }
        },
        {
          "type": "publishable",
          "disabled": false,
          "disabledFieldPresent": true,
          "classification": {
            "kind": "publishable",
            "role": "anon-by-provider-key-contract",
            "ref": null,
            "expectedRefMatch": null,
            "expiry": "opaque-key-no-jwt-expiry"
          }
        }
      ],
      "selectedEnvKeys": [
        {
          "name": "WORDPAIRS_SUPABASE_ANON_KEY",
          "id": "oeu5gPKJ6HNH1n8p",
          "type": "encrypted",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "classification": {
            "kind": "legacy-jwt",
            "role": "anon",
            "ref": "jshjkaigwbxsbnnogfxs",
            "expectedRefMatch": true,
            "expiry": "not-expired-as-decoded",
            "signatureVerified": false
          },
          "matchingProviderPublicKeyCount": 1,
          "matchingEnabledProviderPublicKeyCount": 1,
          "matchingDisabledProviderPublicKeyCount": 0,
          "createdAt": 1793161893819,
          "updatedAt": 1793161893819
        },
        {
          "name": "SUPABASE_ANON_KEY",
          "id": "CNcqRz02JL1Vw8na",
          "type": "encrypted",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "classification": {
            "kind": "legacy-jwt",
            "role": "anon",
            "ref": "jshjkaigwbxsbnnogfxs",
            "expectedRefMatch": true,
            "expiry": "not-expired-as-decoded",
            "signatureVerified": false
          },
          "matchingProviderPublicKeyCount": 1,
          "matchingEnabledProviderPublicKeyCount": 1,
          "matchingDisabledProviderPublicKeyCount": 0,
          "createdAt": 1793160345449,
          "updatedAt": 1793160345449
        }
      ],
      "selectedEnvUrls": [
        {
          "name": "WORDPAIRS_SUPABASE_URL",
          "id": "IhSShRMlytFH4nFM",
          "type": "plain",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "exactExpectedProjectUrlMatch": true,
          "createdAt": 1793161893819,
          "updatedAt": 1793161893819
        },
        {
          "name": "SUPABASE_URL",
          "id": "l7FiJKBZessp1Vu9",
          "type": "encrypted",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "exactExpectedProjectUrlMatch": true,
          "createdAt": 1793160345449,
          "updatedAt": 1793160345449
        }
      ],
      "configuredExplicitAndIntegrationKeysEqual": true
    },
    {
      "logical": "production",
      "projectRef": "krdcuuhcynmdfcjlpbsf",
      "vercelProjectId": "prj_DuOPJUyewR9XfrapB6whbNEyNRxh",
      "accountId": "team_bWASsr4U8yJQls10eWgbkxKH",
      "publicKeyCount": 2,
      "publicKeyMetadata": [
        {
          "type": "legacy",
          "disabled": false,
          "disabledFieldPresent": true,
          "classification": {
            "kind": "legacy-jwt",
            "role": "anon",
            "ref": "krdcuuhcynmdfcjlpbsf",
            "expectedRefMatch": true,
            "expiry": "not-expired-as-decoded",
            "signatureVerified": false
          }
        },
        {
          "type": "publishable",
          "disabled": false,
          "disabledFieldPresent": true,
          "classification": {
            "kind": "publishable",
            "role": "anon-by-provider-key-contract",
            "ref": null,
            "expectedRefMatch": null,
            "expiry": "opaque-key-no-jwt-expiry"
          }
        }
      ],
      "selectedEnvKeys": [
        {
          "name": "WORDPAIRS_SUPABASE_ANON_KEY",
          "id": "U3JIjqsaUcEDIRAO",
          "type": "encrypted",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "classification": {
            "kind": "legacy-jwt",
            "role": "anon",
            "ref": "krdcuuhcynmdfcjlpbsf",
            "expectedRefMatch": true,
            "expiry": "not-expired-as-decoded",
            "signatureVerified": false
          },
          "matchingProviderPublicKeyCount": 1,
          "matchingEnabledProviderPublicKeyCount": 1,
          "matchingDisabledProviderPublicKeyCount": 0,
          "createdAt": 1793161896915,
          "updatedAt": 1793161896915
        },
        {
          "name": "SUPABASE_ANON_KEY",
          "id": "AwiQ81ApVsYNorOp",
          "type": "encrypted",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "classification": {
            "kind": "legacy-jwt",
            "role": "anon",
            "ref": "krdcuuhcynmdfcjlpbsf",
            "expectedRefMatch": true,
            "expiry": "not-expired-as-decoded",
            "signatureVerified": false
          },
          "matchingProviderPublicKeyCount": 1,
          "matchingEnabledProviderPublicKeyCount": 1,
          "matchingDisabledProviderPublicKeyCount": 0,
          "createdAt": 1793160749993,
          "updatedAt": 1793160749993
        }
      ],
      "selectedEnvUrls": [
        {
          "name": "WORDPAIRS_SUPABASE_URL",
          "id": "4YVbEDg8g5VDxouL",
          "type": "plain",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "exactExpectedProjectUrlMatch": true,
          "createdAt": 1793161896915,
          "updatedAt": 1793161896915
        },
        {
          "name": "SUPABASE_URL",
          "id": "LLMFsZJejPSpgDVf",
          "type": "encrypted",
          "target": [
            "production"
          ],
          "decrypted": true,
          "valuePresent": true,
          "exactExpectedProjectUrlMatch": true,
          "createdAt": 1793160749993,
          "updatedAt": 1793160749993
        }
      ],
      "configuredExplicitAndIntegrationKeysEqual": true
    }
  ],
  "claims": {
    "publicKeyEquality": "Both selected production-target public-key variables on each exact Vercel project equal one enabled Supabase public-key record from its exact project. Decoded anon/ref/expiry are classifications, not signature verification.",
    "urlBinding": "Selected explicit and integration URL values equal the exact corresponding provider origin, with optional single trailing slash only.",
    "noRuntimeAcceptance": "No new application/Data API/Realtime requests. Earlier staging401 remains observed; present provider metadata equality neither explains it nor proves the older deployment loaded these exact current values."
  },
  "limitations": [
    "No cryptographic verification, actual gateway/provider acceptance, effective deployed snapshot verification, Data API allowlist or private Realtime handshake/delivery proved.",
    "Only selected public key/URL values retrieved via supported single-variable connector read. No unrelated secret vars retrieved, no values rendered/persisted or transferred into commands/tool arguments.",
    "Discovery listing used decrypt=false. Initial metadata display also included NEXT_PUBLIC public-key/URL IDs and types; their values were never retrieved or used. Final receipt retains only the four requested variable names.",
    "An initial URL projection attempted unavailable URL constructor in the orchestration runtime and reported unparseable. This was a projection error, not a provider observation; strict exact-string equality replaced it before persistence. Both URL bindings match.",
    "No configuration writes, new keys, app traffic, prior probe retry, browser/raw Management API fallback, code/tests/builds/model/HV invocation."
  ],
  "officialSources": [
    {
      "href": "https://supabase.com/docs/guides/getting-started/api-keys",
      "supports": "Public keys identify application components; user identity and RLS are separate. New publishable keys are recommended, while legacy keys are deprecated by end2026."
    },
    {
      "href": "https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys",
      "supports": "Legacy and modern key types work simultaneously; migration is incremental. Current task makes no key migration or rotation."
    },
    {
      "href": "https://supabase.com/changelog/cbc-tls-ciphers-deprecated",
      "supports": "Selected old TLS1.2 ciphers scheduled removal no earlier than November10. This does not establish a cause for an October31 HTTP401."
    }
  ],
  "schemaNotes": {
    "vercel": "get_project_env returns selected values with decrypted=true; filter_project_envs was used decrypt=false only for discovery. Exact identity/account and production-target metadata checked before selected reads.",
    "supabase": "get_publishable_keys includes legacy and modern public keys plus disabled flags. Returned values were compared only in orchestration memory."
  },
  "overallVerdict": "NOT_HV",
  "counts": {
    "pass": 4,
    "fail": 0,
    "unknown": 2
  },
  "accuracy": 99,
  "completeness": 98,
  "findings": [
    {
      "id": "IDENTITY",
      "status": "PASS",
      "detail": "Exact Vercel project/account and corresponding Supabase request scopes verified."
    },
    {
      "id": "PUBLIC-KEY-MATCH",
      "status": "PASS",
      "detail": "Four selected production-target public-key variables each match one enabled correct-project key; none matches a disabled key."
    },
    {
      "id": "URL-MATCH",
      "status": "PASS",
      "detail": "All four selected URL variables match exact correct project origin."
    },
    {
      "id": "CLASSIFICATION",
      "status": "PASS",
      "detail": "Provider legacy public keys and configured keys decode roleanon/correctref/notexpired; both projects also report one enabled modern publishable key. Classification is not signature validation."
    },
    {
      "id": "DEPLOYED-SNAPSHOT",
      "status": "UNKNOWN",
      "detail": "Missing exact deployed environment snapshot comparison; current project env records are not proof of older hosted runtime contents."
    },
    {
      "id": "GATEWAY-AND-REALTIME",
      "status": "UNKNOWN",
      "detail": "Earlier anonymousDataAPI401 cause unresolved. Actual gateway/privateRealtime acceptance remains untested in this task."
    }
  ]
}
'@|ConvertFrom-Json -Depth 50 -AsHashtable
if(-not $PSCmdlet.ShouldProcess($path,'Save only safe public-key metadata, boolean comparisons and explicit evidence limits')){return}
if(Test-Path -LiteralPath $path){throw 'Preserve prior diagnosis receipt'}
$state=Get-Content -LiteralPath /tmp/wordpairs-hosting-resume-20261031/session-state.yaml -Raw|ConvertFrom-Yaml
$turn=Get-Content -LiteralPath /tmp/wordpairs-hosting-resume-20261031/current-turn.yaml -Raw|ConvertFrom-Yaml
$record['sessionId']=$state.sessionId;$record['requestId']=$turn.turnRequestId
$record['parentSessionId']='Codex-20261027T100516Z-plugin-session';$record['parentRequestId']='req-20261031T142639Z-release-resume'
$record['recordedAtLocal']=[DateTimeOffset]::Now.ToString('o')
$producer=Join-Path $folder 'public-key-diagnosis-20261031.producer.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $producer
if((Get-FileHash -LiteralPath $producer).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Producer retention mismatch'}
$record['producer']=@{path=$producer;sha256=(Get-FileHash -LiteralPath $producer).Hash}
$record|ConvertTo-Json -Depth 60|Set-Content -LiteralPath $path
$response=(Get-Date -Format s)+' - Read-only public-key diagnosis receipt '+$path+' SHA256 '+(Get-FileHash -LiteralPath $path).Hash+'. NOT_HV PASS4/FAIL0/UNKNOWN2, accuracy99/completeness98 for bounded metadata/equality scope. No runtime acceptance or401cause claim.'+"`n"+($record|ConvertTo-Json -Depth 60)
[IO.File]::WriteAllText('/tmp/wordpairs-public-key-diagnosis-response.txt',$response)
[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;producerSha256=(Get-FileHash -LiteralPath $producer).Hash;sessionId=$state.sessionId;requestId=$turn.turnRequestId}|ConvertTo-Json

