import AuthenticationServices
import Capacitor

class VincereViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeSignInPlugin())
    }
}

@objc(NativeSignInPlugin)
public class NativeSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "NativeSignInPlugin"
    public let jsName = "NativeSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "apple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "oauth", returnType: CAPPluginReturnPromise)
    ]
    private var pending: CAPPluginCall?
    private var expectedState: String?
    private var controller: ASAuthorizationController?
    private var webSession: ASWebAuthenticationSession?
    private var anchor: ASPresentationAnchor?

    private func begin(_ call: CAPPluginCall) -> Bool {
        guard pending == nil, let window = bridge?.viewController?.view.window else {
            call.reject("Authentication unavailable or already active", "AUTH_UNAVAILABLE")
            return false
        }
        pending = call
        anchor = window
        return true
    }
    private func clear() {
        pending = nil
        expectedState = nil
        controller = nil
        webSession = nil
        anchor = nil
    }
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return anchor!
    }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return anchor!
    }
    @objc func apple(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let nonce = call.getString("nonce"), nonce.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
                  let state = call.getString("state"), UUID(uuidString: state) != nil else {
                call.reject("Invalid authentication request", "AUTH_INVALID_REQUEST")
                return
            }
            guard self.begin(call) else { return }
            self.expectedState = state
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]
            request.nonce = nonce
            request.state = state
            let controller = ASAuthorizationController(authorizationRequests: [request])
            self.controller = controller
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pending else { return }
        defer { clear() }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              credential.state == expectedState,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            call.reject("Invalid Apple response", "AUTH_INVALID_RESPONSE")
            return
        }
        // Profile setup collects the nickname; no personal name is requested from Apple.
        call.resolve(["identityToken": token, "state": credential.state ?? ""])
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let call = pending
        clear()
        let cancelled = (error as? ASAuthorizationError)?.code == .canceled
        call?.reject(cancelled ? "Authentication cancelled" : "Apple authentication failed",
                     cancelled ? "AUTH_CANCELLED" : "AUTH_FAILED")
    }
    @objc func oauth(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let raw = call.getString("url"), let url = URL(string: raw),
                  url.scheme == "https", url.host == "axityxhqhmlmhtboebzi.supabase.co",
                  url.path == "/auth/v1/authorize", url.user == nil, url.password == nil else {
                call.reject("Invalid OAuth URL", "AUTH_INVALID_REQUEST")
                return
            }
            guard self.begin(call) else { return }
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "app.vincere.fitness") { callback, error in
                DispatchQueue.main.async {
                    let pending = self.pending
                    self.clear()
                    if let callback = callback {
                        pending?.resolve(["url": callback.absoluteString])
                    } else {
                        let cancelled = (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin
                        pending?.reject(cancelled ? "Authentication cancelled" : "OAuth authentication failed",
                                        cancelled ? "AUTH_CANCELLED" : "AUTH_FAILED")
                    }
                }
            }
            self.webSession = session
            session.presentationContextProvider = self
            if !session.start() {
                self.clear()
                call.reject("Unable to open authentication", "AUTH_UNAVAILABLE")
            }
        }
    }
}
